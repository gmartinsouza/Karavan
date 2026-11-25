import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { problemSchema } from '../../shared/errors.js';
import type { Authenticate } from '../auth/authenticate.js';
import { vehicleParams } from '../vehicles/schemas.js';
import { createReviewBody, reviewParams, reviewResponse, updateReviewBody } from './schemas.js';
import type { EvaluatedReview, ReviewService } from './service.js';

function toReviewResponse({ plan, evaluation }: EvaluatedReview) {
  return {
    id: plan.id,
    vehicleId: plan.vehicleId,
    name: plan.name,
    intervalKm: plan.intervalKm,
    intervalMonths: plan.intervalMonths,
    lastDoneAt: plan.lastDoneAt.toISOString(),
    lastDoneKm: plan.lastDoneKm,
    status: evaluation.status,
    dueKm: evaluation.dueKm,
    dueDate: evaluation.dueDate?.toISOString() ?? null,
    remainingKm: evaluation.remainingKm,
    remainingDays: evaluation.remainingDays,
  };
}

export const reviewRoutes: FastifyPluginCallbackZod<{
  reviews: ReviewService;
  authenticate: Authenticate;
}> = (app, { reviews, authenticate }, done) => {
  app.addHook('onRequest', authenticate);
  const tags = ['reviews'];
  const security = [{ bearerAuth: [] }];

  app.get(
    '/vehicles/:vehicleId/reviews',
    {
      schema: {
        tags,
        security,
        summary: 'Lista as revisões programadas com o status de cada uma (atrasadas primeiro)',
        params: vehicleParams,
        response: { 200: z.array(reviewResponse), 404: problemSchema },
      },
    },
    async (request) =>
      (await reviews.list(request.userId, request.params.vehicleId)).map(toReviewResponse),
  );

  app.post(
    '/vehicles/:vehicleId/reviews',
    {
      schema: {
        tags,
        security,
        summary: 'Programa uma revisão por km, por meses ou pelos dois',
        params: vehicleParams,
        body: createReviewBody,
        response: { 201: reviewResponse, 400: problemSchema, 404: problemSchema },
      },
    },
    async (request, reply) => {
      const review = await reviews.create(request.userId, request.params.vehicleId, request.body);
      return reply.code(201).send(toReviewResponse(review));
    },
  );

  app.patch(
    '/vehicles/:vehicleId/reviews/:reviewId',
    {
      schema: {
        tags,
        security,
        summary: 'Altera uma revisão; envie lastDoneAt e lastDoneKm para marcar como feita',
        params: reviewParams,
        body: updateReviewBody,
        response: { 200: reviewResponse, 404: problemSchema, 422: problemSchema },
      },
    },
    async (request) =>
      toReviewResponse(
        await reviews.update(
          request.userId,
          request.params.vehicleId,
          request.params.reviewId,
          request.body,
        ),
      ),
  );

  app.delete(
    '/vehicles/:vehicleId/reviews/:reviewId',
    {
      schema: {
        tags,
        security,
        summary: 'Remove uma revisão programada',
        params: reviewParams,
        response: { 204: z.null().describe('Removida'), 404: problemSchema },
      },
    },
    async (request, reply) => {
      await reviews.remove(request.userId, request.params.vehicleId, request.params.reviewId);
      return reply.code(204).send(null);
    },
  );

  done();
};
