import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Maintenance } from '../../generated/prisma/client.js';
import { problemSchema } from '../../shared/errors.js';
import { pageResponse, paginationQuery } from '../../shared/pagination.js';
import type { Authenticate } from '../auth/authenticate.js';
import { vehicleParams } from '../vehicles/schemas.js';
import { createMaintenanceBody, maintenanceParams, maintenanceResponse } from './schemas.js';
import type { MaintenanceService } from './service.js';

function toMaintenanceResponse(maintenance: Maintenance) {
  return {
    id: maintenance.id,
    vehicleId: maintenance.vehicleId,
    kind: maintenance.kind,
    item: maintenance.item,
    performedAt: maintenance.performedAt.toISOString(),
    odometerKm: maintenance.odometerKm,
    cost: maintenance.cost.toNumber(),
    workshop: maintenance.workshop,
    notes: maintenance.notes,
    createdAt: maintenance.createdAt.toISOString(),
  };
}

export const maintenanceRoutes: FastifyPluginCallbackZod<{
  maintenances: MaintenanceService;
  authenticate: Authenticate;
}> = (app, { maintenances, authenticate }, done) => {
  app.addHook('onRequest', authenticate);
  const tags = ['maintenances'];
  const security = [{ bearerAuth: [] }];

  app.get(
    '/vehicles/:vehicleId/maintenances',
    {
      schema: {
        tags,
        security,
        summary: 'Lista manutenções, da mais recente para a mais antiga',
        params: vehicleParams,
        querystring: paginationQuery,
        response: { 200: pageResponse(maintenanceResponse), 404: problemSchema },
      },
    },
    async (request) => {
      const page = await maintenances.list(request.userId, request.params.vehicleId, request.query);
      return { ...page, items: page.items.map(toMaintenanceResponse) };
    },
  );

  app.post(
    '/vehicles/:vehicleId/maintenances',
    {
      schema: {
        tags,
        security,
        summary: 'Registra uma manutenção',
        params: vehicleParams,
        body: createMaintenanceBody,
        response: {
          201: maintenanceResponse,
          400: problemSchema,
          404: problemSchema,
          422: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const maintenance = await maintenances.create(
        request.userId,
        request.params.vehicleId,
        request.body,
      );
      return reply.code(201).send(toMaintenanceResponse(maintenance));
    },
  );

  app.delete(
    '/vehicles/:vehicleId/maintenances/:maintenanceId',
    {
      schema: {
        tags,
        security,
        summary: 'Remove uma manutenção',
        params: maintenanceParams,
        response: { 204: z.null().describe('Removida'), 404: problemSchema },
      },
    },
    async (request, reply) => {
      await maintenances.remove(
        request.userId,
        request.params.vehicleId,
        request.params.maintenanceId,
      );
      return reply.code(204).send(null);
    },
  );

  done();
};
