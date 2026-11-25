import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Fueling } from '../../generated/prisma/client.js';
import { problemSchema } from '../../shared/errors.js';
import { pageResponse } from '../../shared/pagination.js';
import type { Authenticate } from '../auth/authenticate.js';
import { vehicleParams } from '../vehicles/schemas.js';
import {
  createFuelingBody,
  fuelingParams,
  fuelingResponse,
  listFuelingsQuery,
  updateFuelingBody,
} from './schemas.js';
import type { FuelingService } from './service.js';

function toFuelingResponse(fueling: Fueling) {
  return {
    id: fueling.id,
    vehicleId: fueling.vehicleId,
    filledAt: fueling.filledAt.toISOString(),
    liters: fueling.liters.toNumber(),
    pricePerLiter: fueling.pricePerLiter.toNumber(),
    totalCost: fueling.totalCost.toNumber(),
    odometerKm: fueling.odometerKm,
    station: fueling.station,
    fullTank: fueling.fullTank,
    createdAt: fueling.createdAt.toISOString(),
  };
}

export const fuelingRoutes: FastifyPluginCallbackZod<{
  fuelings: FuelingService;
  authenticate: Authenticate;
}> = (app, { fuelings, authenticate }, done) => {
  app.addHook('onRequest', authenticate);
  const tags = ['fuelings'];
  const security = [{ bearerAuth: [] }];

  app.get(
    '/vehicles/:vehicleId/fuelings',
    {
      schema: {
        tags,
        security,
        summary: 'Lista abastecimentos, do mais recente para o mais antigo',
        params: vehicleParams,
        querystring: listFuelingsQuery,
        response: { 200: pageResponse(fuelingResponse), 400: problemSchema, 404: problemSchema },
      },
    },
    async (request) => {
      const page = await fuelings.list(request.userId, request.params.vehicleId, request.query);
      return { ...page, items: page.items.map(toFuelingResponse) };
    },
  );

  app.post(
    '/vehicles/:vehicleId/fuelings',
    {
      schema: {
        tags,
        security,
        summary: 'Registra um abastecimento',
        params: vehicleParams,
        body: createFuelingBody,
        response: {
          201: fuelingResponse,
          400: problemSchema,
          404: problemSchema,
          422: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const fueling = await fuelings.create(request.userId, request.params.vehicleId, request.body);
      return reply.code(201).send(toFuelingResponse(fueling));
    },
  );

  app.patch(
    '/vehicles/:vehicleId/fuelings/:fuelingId',
    {
      schema: {
        tags,
        security,
        summary: 'Corrige um abastecimento; só os campos enviados mudam',
        params: fuelingParams,
        body: updateFuelingBody,
        response: {
          200: fuelingResponse,
          400: problemSchema,
          404: problemSchema,
          422: problemSchema,
        },
      },
    },
    async (request) =>
      toFuelingResponse(
        await fuelings.update(
          request.userId,
          request.params.vehicleId,
          request.params.fuelingId,
          request.body,
        ),
      ),
  );

  app.delete(
    '/vehicles/:vehicleId/fuelings/:fuelingId',
    {
      schema: {
        tags,
        security,
        summary: 'Remove um abastecimento lançado por engano',
        params: fuelingParams,
        response: { 204: z.null().describe('Removido'), 404: problemSchema },
      },
    },
    async (request, reply) => {
      await fuelings.remove(request.userId, request.params.vehicleId, request.params.fuelingId);
      return reply.code(204).send(null);
    },
  );

  done();
};
