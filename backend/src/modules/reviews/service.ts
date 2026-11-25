import { evaluateReview, type ReviewEvaluation } from '../../domain/review.js';
import type { ReviewPlan } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { withoutUndefined } from '../../shared/objects.js';
import { findOwnedVehicle } from '../vehicles/ownership.js';
import type { CreateReviewInput, UpdateReviewInput } from './schemas.js';

export interface EvaluatedReview {
  plan: ReviewPlan;
  evaluation: ReviewEvaluation;
}

export interface ReviewService {
  list(userId: string, vehicleId: string): Promise<EvaluatedReview[]>;
  create(userId: string, vehicleId: string, input: CreateReviewInput): Promise<EvaluatedReview>;
  update(
    userId: string,
    vehicleId: string,
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<EvaluatedReview>;
  remove(userId: string, vehicleId: string, reviewId: string): Promise<void>;
}

const statusOrder = { overdue: 0, due_soon: 1, ok: 2 } as const;

export function createReviewService(deps: { database: Database; now?: () => Date }): ReviewService {
  const { database } = deps;
  const now = deps.now ?? (() => new Date());

  const evaluate = (plan: ReviewPlan, currentKm: number): EvaluatedReview => ({
    plan,
    evaluation: evaluateReview(plan, currentKm, now()),
  });

  async function findOwnedPlan(userId: string, vehicleId: string, reviewId: string) {
    const vehicle = await findOwnedVehicle(database, userId, vehicleId);
    const plan = await database.reviewPlan.findFirst({ where: { id: reviewId, vehicleId } });
    if (!plan) {
      throw problems.notFound('Revisão não encontrada.');
    }
    return { vehicle, plan };
  }

  return {
    async list(userId, vehicleId) {
      const vehicle = await findOwnedVehicle(database, userId, vehicleId);
      const plans = await database.reviewPlan.findMany({
        where: { vehicleId },
        orderBy: { name: 'asc' },
      });
      return plans
        .map((plan) => evaluate(plan, vehicle.odometerKm))
        .sort((a, b) => statusOrder[a.evaluation.status] - statusOrder[b.evaluation.status]);
    },

    async create(userId, vehicleId, input) {
      const vehicle = await findOwnedVehicle(database, userId, vehicleId);
      const plan = await database.reviewPlan.create({
        data: { ...input, vehicleId, lastDoneAt: new Date(input.lastDoneAt) },
      });
      return evaluate(plan, vehicle.odometerKm);
    },

    async update(userId, vehicleId, reviewId, input) {
      const { vehicle, plan } = await findOwnedPlan(userId, vehicleId, reviewId);
      const intervalKm = input.intervalKm === undefined ? plan.intervalKm : input.intervalKm;
      const intervalMonths =
        input.intervalMonths === undefined ? plan.intervalMonths : input.intervalMonths;
      if (intervalKm === null && intervalMonths === null) {
        throw problems.unprocessable('A revisão precisa de intervalo em km, em meses ou nos dois.');
      }
      const updated = await database.reviewPlan.update({
        where: { id: plan.id },
        data: {
          ...withoutUndefined(input),
          ...(input.lastDoneAt === undefined ? {} : { lastDoneAt: new Date(input.lastDoneAt) }),
        },
      });
      return evaluate(updated, vehicle.odometerKm);
    },

    async remove(userId, vehicleId, reviewId) {
      const { plan } = await findOwnedPlan(userId, vehicleId, reviewId);
      await database.reviewPlan.delete({ where: { id: plan.id } });
    },
  };
}
