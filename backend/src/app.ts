import { randomUUID } from 'node:crypto';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { LogController } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config.js';
import { healthRoutes, type ReadinessCheck } from './modules/health/routes.js';
import { loggerOptions } from './shared/logger.js';

export interface AppDependencies {
  config: Config;
  readinessChecks?: ReadinessCheck[];
}

export async function buildApp({ config, readinessChecks = [] }: AppDependencies) {
  const app = Fastify({
    logger: loggerOptions(config),
    requestIdHeader: 'x-request-id',
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Caravana API',
        description: 'Gerenciamento de veículos, abastecimentos, manutenções e revisões',
        version: '0.1.0',
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(healthRoutes, { readinessChecks });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
