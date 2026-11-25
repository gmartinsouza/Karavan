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
import { createAuthenticate } from './modules/auth/authenticate.js';
import { authRoutes } from './modules/auth/routes.js';
import { createAuthService } from './modules/auth/service.js';
import { createTokenService } from './modules/auth/tokens.js';
import { healthRoutes, type ReadinessCheck } from './modules/health/routes.js';
import { databaseReadinessCheck, type Database } from './shared/database.js';
import { registerErrorHandling } from './shared/errors.js';
import { loggerOptions } from './shared/logger.js';

export interface AppDependencies {
  config: Config;
  database: Database;
  readinessChecks?: ReadinessCheck[];
}

export async function buildApp({ config, database, readinessChecks }: AppDependencies) {
  const app = Fastify({
    logger: loggerOptions(config),
    requestIdHeader: 'x-request-id',
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('userId', '');
  registerErrorHandling(app);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Caravana API',
        description: 'Gerenciamento de veículos, abastecimentos, manutenções e revisões',
        version: '0.1.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  const tokens = createTokenService({
    secret: config.auth.jwtSecret,
    accessTokenTtlSeconds: config.auth.accessTokenTtlSeconds,
  });
  const auth = createAuthService({
    database,
    tokens,
    refreshTokenTtlDays: config.auth.refreshTokenTtlDays,
  });
  const authenticate = createAuthenticate(tokens);

  await app.register(healthRoutes, {
    readinessChecks: readinessChecks ?? [databaseReadinessCheck(database)],
  });
  await app.register(authRoutes, { prefix: '/api/v1', auth, authenticate });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
