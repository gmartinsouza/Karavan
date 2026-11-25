import { z } from 'zod';

export const reviewParams = z.object({ vehicleId: z.uuid(), reviewId: z.uuid() });

const intervalKm = z.number().int().positive().max(200_000).nullable().meta({ example: 10_000 });
const intervalMonths = z.number().int().positive().max(120).nullable().meta({ example: 12 });

const reviewFields = z.object({
  name: z.string().trim().min(2).max(80).meta({ example: 'Troca de óleo' }),
  intervalKm,
  intervalMonths,
  lastDoneAt: z.iso.datetime({ offset: true }).meta({ example: '2026-03-10T09:00:00-03:00' }),
  lastDoneKm: z.number().int().min(0).meta({ example: 43_584 }),
});

export const createReviewBody = reviewFields
  .extend({ intervalKm: intervalKm.default(null), intervalMonths: intervalMonths.default(null) })
  .refine((body) => body.intervalKm !== null || body.intervalMonths !== null, {
    error: 'informe intervalKm, intervalMonths ou os dois',
  });

export const updateReviewBody = reviewFields
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'envie pelo menos um campo');

export const reviewStatusSchema = z
  .enum(['ok', 'due_soon', 'overdue'])
  .describe('ok = em dia, due_soon = próxima, overdue = atrasada');

export const reviewResponse = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  name: z.string(),
  intervalKm: z.number().int().nullable(),
  intervalMonths: z.number().int().nullable(),
  lastDoneAt: z.iso.datetime(),
  lastDoneKm: z.number().int(),
  status: reviewStatusSchema,
  dueKm: z.number().int().nullable(),
  dueDate: z.iso.datetime().nullable(),
  remainingKm: z.number().int().nullable(),
  remainingDays: z.number().int().nullable(),
});

export type CreateReviewInput = z.infer<typeof createReviewBody>;
export type UpdateReviewInput = z.infer<typeof updateReviewBody>;
