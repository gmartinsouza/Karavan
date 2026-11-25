import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export interface ReadinessCheck {
  name: string;
  check: () => Promise<void>;
}

const checkResultSchema = z.object({
  name: z.string(),
  status: z.enum(['up', 'down']),
});

const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.array(checkResultSchema),
});

export const healthRoutes: FastifyPluginCallbackZod<{ readinessChecks: ReadinessCheck[] }> = (
  app,
  { readinessChecks },
  done,
) => {
  app.get(
    '/health/live',
    {
      schema: {
        tags: ['health'],
        summary: 'O processo está de pé',
        response: { 200: z.object({ status: z.literal('ok') }) },
      },
    },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'As dependências estão acessíveis',
        response: { 200: readinessResponseSchema, 503: readinessResponseSchema },
      },
    },
    async (request, reply) => {
      const checks = await Promise.all(
        readinessChecks.map(async ({ name, check }) => {
          try {
            await check();
            return { name, status: 'up' as const };
          } catch (error) {
            request.log.warn({ err: error, check: name }, 'readiness check falhou');
            return { name, status: 'down' as const };
          }
        }),
      );
      const ready = checks.every((result) => result.status === 'up');
      return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', checks });
    },
  );

  done();
};
