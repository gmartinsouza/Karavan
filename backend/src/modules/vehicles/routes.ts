import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Vehicle } from '../../generated/prisma/client.js';
import { problemSchema } from '../../shared/errors.js';
import { pageResponse, paginationQuery } from '../../shared/pagination.js';
import type { Authenticate } from '../auth/authenticate.js';
import { createVehicleBody, updateVehicleBody, vehicleParams, vehicleResponse } from './schemas.js';
import type { VehicleService } from './service.js';

function toVehicleResponse(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    plate: vehicle.plate,
    fuelType: vehicle.fuelType,
    odometerKm: vehicle.odometerKm,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export const vehicleRoutes: FastifyPluginCallbackZod<{
  vehicles: VehicleService;
  authenticate: Authenticate;
}> = (app, { vehicles, authenticate }, done) => {
  app.addHook('onRequest', authenticate);
  const tags = ['vehicles'];
  const security = [{ bearerAuth: [] }];

  app.get(
    '/vehicles',
    {
      schema: {
        tags,
        security,
        summary: 'Lista os veículos do usuário',
        querystring: paginationQuery,
        response: { 200: pageResponse(vehicleResponse), 401: problemSchema },
      },
    },
    async (request) => {
      const page = await vehicles.list(request.userId, request.query);
      return { ...page, items: page.items.map(toVehicleResponse) };
    },
  );

  app.post(
    '/vehicles',
    {
      schema: {
        tags,
        security,
        summary: 'Cadastra um veículo',
        body: createVehicleBody,
        response: {
          201: vehicleResponse,
          400: problemSchema,
          409: problemSchema,
          422: problemSchema,
        },
      },
    },
    async (request, reply) => {
      const vehicle = await vehicles.create(request.userId, request.body);
      return reply.code(201).send(toVehicleResponse(vehicle));
    },
  );

  app.get(
    '/vehicles/:vehicleId',
    {
      schema: {
        tags,
        security,
        summary: 'Detalha um veículo',
        params: vehicleParams,
        response: { 200: vehicleResponse, 404: problemSchema },
      },
    },
    async (request) =>
      toVehicleResponse(await vehicles.get(request.userId, request.params.vehicleId)),
  );

  app.patch(
    '/vehicles/:vehicleId',
    {
      schema: {
        tags,
        security,
        summary: 'Altera dados de um veículo',
        params: vehicleParams,
        body: updateVehicleBody,
        response: {
          200: vehicleResponse,
          404: problemSchema,
          409: problemSchema,
          422: problemSchema,
        },
      },
    },
    async (request) =>
      toVehicleResponse(
        await vehicles.update(request.userId, request.params.vehicleId, request.body),
      ),
  );

  app.delete(
    '/vehicles/:vehicleId',
    {
      schema: {
        tags,
        security,
        summary: 'Remove um veículo e todo o histórico dele',
        params: vehicleParams,
        response: { 204: z.null().describe('Removido'), 404: problemSchema },
      },
    },
    async (request, reply) => {
      await vehicles.remove(request.userId, request.params.vehicleId);
      return reply.code(204).send(null);
    },
  );

  done();
};
