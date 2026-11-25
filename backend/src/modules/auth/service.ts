import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateRefreshToken, hashRefreshToken, type TokenService } from './tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const DUMMY_PASSWORD_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Session {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface AuthService {
  register(input: { name: string; email: string; password: string }): Promise<UserProfile>;
  login(input: { email: string; password: string }): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  logout(refreshToken: string): Promise<void>;
  getProfile(userId: string): Promise<UserProfile>;
}

const profileFields = { id: true, name: true, email: true, createdAt: true } as const;

export function createAuthService(deps: {
  database: Database;
  tokens: TokenService;
  refreshTokenTtlDays: number;
}): AuthService {
  const { database, tokens, refreshTokenTtlDays } = deps;

  async function startSession(
    client: Prisma.TransactionClient | Database,
    userId: string,
    familyId: string,
  ) {
    const refreshToken = generateRefreshToken();
    const stored = await client.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTokenTtlDays * DAY_MS),
      },
    });
    const access = await tokens.issueAccessToken(userId);
    return {
      storedId: stored.id,
      session: { accessToken: access.token, expiresIn: access.expiresIn, refreshToken },
    };
  }

  async function revokeFamily(familyId: string) {
    await database.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return {
    async register({ name, email, password }) {
      try {
        return await database.user.create({
          data: { name, email, passwordHash: await hashPassword(password) },
          select: profileFields,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw problems.conflict('Já existe uma conta com este e-mail.');
        }
        throw error;
      }
    },

    async login({ email, password }) {
      const user = await database.user.findUnique({ where: { email } });
      const passwordMatches = await verifyPassword(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );
      if (!user || !passwordMatches) {
        throw problems.unauthorized('E-mail ou senha incorretos.');
      }
      const { session } = await startSession(database, user.id, randomUUID());
      return session;
    },

    async refresh(refreshToken) {
      const current = await database.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
      });
      if (!current) {
        throw problems.unauthorized('Refresh token inválido.');
      }
      if (current.expiresAt <= new Date()) {
        throw problems.unauthorized('Refresh token expirado. Faça login novamente.');
      }
      const endedWithoutRotation = current.revokedAt !== null && current.replacedById === null;
      if (endedWithoutRotation) {
        throw problems.unauthorized('Sessão encerrada. Faça login novamente.');
      }

      const rotated = await database.$transaction(async (transaction) => {
        const claimed = await transaction.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (claimed.count === 0) {
          return null;
        }
        const next = await startSession(transaction, current.userId, current.familyId);
        await transaction.refreshToken.update({
          where: { id: current.id },
          data: { replacedById: next.storedId },
        });
        return next.session;
      });

      if (!rotated) {
        await revokeFamily(current.familyId);
        throw problems.unauthorized(
          'Refresh token já utilizado. Por segurança, a sessão foi encerrada.',
        );
      }
      return rotated;
    },

    async logout(refreshToken) {
      const current = await database.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
      });
      if (current) {
        await revokeFamily(current.familyId);
      }
    },

    async getProfile(userId) {
      const user = await database.user.findUnique({ where: { id: userId }, select: profileFields });
      if (!user) {
        throw problems.unauthorized('Usuário não existe mais.');
      }
      return user;
    },
  };
}
