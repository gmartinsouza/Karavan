import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { problemSchema } from '../../shared/errors.js';
import type { Authenticate } from './authenticate.js';
import { loginBody, refreshBody, registerBody, sessionResponse, userResponse } from './schemas.js';
import type { AuthService, Session, UserProfile } from './service.js';

function toUserResponse(user: UserProfile) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}

function toSessionResponse(session: Session) {
  return { tokenType: 'Bearer' as const, ...session };
}

export const authRoutes: FastifyPluginCallbackZod<{
  auth: AuthService;
  authenticate: Authenticate;
}> = (app, { auth, authenticate }, done) => {
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
    async (request) => toSessionResponse(await auth.login(request.body)),
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
    async (request) => toSessionResponse(await auth.refresh(request.body.refreshToken)),
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
      await auth.logout(request.body.refreshToken);
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
