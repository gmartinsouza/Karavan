import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { problems, problemSchema } from '../../shared/errors.js';
import type { Authenticate } from './authenticate.js';
import { loginBody, refreshBody, registerBody, sessionResponse, userResponse } from './schemas.js';
import type { AuthService, Session, UserProfile } from './service.js';

function toUserResponse(user: UserProfile) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}

function toSessionResponse(session: Session) {
  return { tokenType: 'Bearer' as const, ...session };
}

// Nome e caminho do cookie do refresh token. O caminho limita o envio do cookie
// às rotas /auth, então ele não viaja em toda requisição.
const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface RefreshCookieOptions {
  secure: boolean;
  maxAgeSeconds: number;
}

export const authRoutes: FastifyPluginCallbackZod<{
  auth: AuthService;
  authenticate: Authenticate;
  refreshCookie: RefreshCookieOptions;
}> = (app, { auth, authenticate, refreshCookie }, done) => {
  // httpOnly: o JavaScript da página não consegue ler o cookie (protege contra XSS).
  // sameSite strict: o navegador não envia o cookie em requisições vindas de outros sites.
  function setRefreshCookie(reply: FastifyReply, session: Session) {
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: refreshCookie.secure,
      path: REFRESH_COOKIE_PATH,
      maxAge: refreshCookie.maxAgeSeconds,
    });
  }

  // Usa o token do corpo se veio; senão, o do cookie.
  function refreshTokenFrom(
    request: FastifyRequest<{ Body: { refreshToken?: string | undefined } }>,
  ) {
    return request.body.refreshToken ?? request.cookies[REFRESH_COOKIE];
  }
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Cria uma conta',
        body: registerBody,
        response: { 201: userResponse, 400: problemSchema, 409: problemSchema },
      },
    },
    async (request, reply) => {
      const user = await auth.register(request.body);
      return reply.code(201).send(toUserResponse(user));
    },
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Entra com e-mail e senha',
        body: loginBody,
        response: { 200: sessionResponse, 400: problemSchema, 401: problemSchema },
      },
    },
    async (request, reply) => {
      const session = await auth.login(request.body);
      setRefreshCookie(reply, session);
      return toSessionResponse(session);
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Troca um refresh token por um par novo (o antigo deixa de valer)',
        body: refreshBody,
        response: { 200: sessionResponse, 401: problemSchema },
      },
    },
    async (request, reply) => {
      const refreshToken = refreshTokenFrom(request);
      if (!refreshToken) {
        throw problems.unauthorized('Envie o refresh token no corpo ou no cookie.');
      }
      const session = await auth.refresh(refreshToken);
      setRefreshCookie(reply, session);
      return toSessionResponse(session);
    },
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Encerra a sessão do refresh token informado',
        body: refreshBody,
        response: { 204: z.null().describe('Sessão encerrada') },
      },
    },
    async (request, reply) => {
      const refreshToken = refreshTokenFrom(request);
      if (refreshToken) {
        await auth.logout(refreshToken);
      }
      reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/me',
    {
      onRequest: authenticate,
      schema: {
        tags: ['auth'],
        summary: 'Dados do usuário autenticado',
        security: [{ bearerAuth: [] }],
        response: { 200: userResponse, 401: problemSchema },
      },
    },
    async (request) => toUserResponse(await auth.getProfile(request.userId)),
  );

  done();
};
