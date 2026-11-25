import type { FastifyRequest } from 'fastify';
import { problems } from '../../shared/errors.js';
import type { TokenService } from './tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export type Authenticate = (request: FastifyRequest) => Promise<void>;

export function createAuthenticate(tokens: TokenService): Authenticate {
  return async (request) => {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw problems.unauthorized('Envie o cabeçalho Authorization: Bearer <access token>.');
    }
    const userId = await tokens.verifyAccessToken(token);
    if (!userId) {
      throw problems.unauthorized('Access token inválido ou expirado.');
    }
    request.userId = userId;
  };
}
