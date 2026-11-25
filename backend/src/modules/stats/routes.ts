import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { problemSchema } from '../../shared/errors.js';
import type { Authenticate } from '../auth/authenticate.js';
import { vehicleParams } from '../vehicles/schemas.js';
import { statsQuery, statsResponse } from './schemas.js';
import type { StatsService } from './service.js';

export const statsRoutes: FastifyPluginCallbackZod<{
  stats: StatsService;
  authenticate: Authenticate;
}> = (app, { stats, authenticate }, done) => {
  app.addHook('onRequest', authenticate);

  app.get(
    '/vehicles/:vehicleId/stats',
    {
      schema: {
        tags: ['stats'],
        security: [{ bearerAuth: [] }],
        summary: 'Consumo (km/l), custo por km e gastos por mês de um veículo',
        params: vehicleParams,
        querystring: statsQuery,
        response: { 200: statsResponse, 400: problemSchema, 404: problemSchema },
      },
    },
    async (request) => stats.forVehicle(request.userId, request.params.vehicleId, request.query),
  );

  done();
};
