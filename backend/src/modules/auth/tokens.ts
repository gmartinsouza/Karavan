import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'caravana';
const AUDIENCE = 'caravana-api';
const ALGORITHM = 'HS256';

export interface AccessToken {
  token: string;
  expiresIn: number;
}

export interface TokenService {
  issueAccessToken(userId: string): Promise<AccessToken>;
  verifyAccessToken(token: string): Promise<string | null>;
}

export function createTokenService(options: {
  secret: string;
  accessTokenTtlSeconds: number;
}): TokenService {
  const key = new TextEncoder().encode(options.secret);

  return {
    async issueAccessToken(userId) {
      const token = await new SignJWT()
        .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${options.accessTokenTtlSeconds}s`)
        .sign(key);
      return { token, expiresIn: options.accessTokenTtlSeconds };
    },

    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: ISSUER,
          audience: AUDIENCE,
          algorithms: [ALGORITHM],
        });
        return payload.sub ?? null;
      } catch {
        return null;
      }
    },
  };
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
