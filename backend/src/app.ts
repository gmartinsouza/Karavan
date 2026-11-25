import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
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
import { fuelingRoutes } from './modules/fuelings/routes.js';
import { createFuelingService } from './modules/fuelings/service.js';
import { healthRoutes, type ReadinessCheck } from './modules/health/routes.js';
import { maintenanceRoutes } from './modules/maintenances/routes.js';
import { createMaintenanceService } from './modules/maintenances/service.js';
import { reviewRoutes } from './modules/reviews/routes.js';
import { createReviewService } from './modules/reviews/service.js';
import { vehicleRoutes } from './modules/vehicles/routes.js';
import { createVehicleService } from './modules/vehicles/service.js';
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

  // CORS: só o front-end configurado pode chamar a API pelo navegador.
  // credentials: true deixa o navegador enviar o cookie do refresh token.
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(cookie);

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
  await app.register(authRoutes, {
    prefix: '/api/v1',
    auth,
    authenticate,
    refreshCookie: {
      secure: config.env === 'production',
      maxAgeSeconds: config.auth.refreshTokenTtlDays * 24 * 60 * 60,
    },
  });
  await app.register(vehicleRoutes, {
    prefix: '/api/v1',
    vehicles: createVehicleService({ database }),
    authenticate,
  });
  await app.register(fuelingRoutes, {
    prefix: '/api/v1',
    fuelings: createFuelingService({ database }),
    authenticate,
  });
  await app.register(maintenanceRoutes, {
    prefix: '/api/v1',
    maintenances: createMaintenanceService({ database }),
    authenticate,
  });
  await app.register(reviewRoutes, {
    prefix: '/api/v1',
    reviews: createReviewService({ database }),
    authenticate,
  });

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
