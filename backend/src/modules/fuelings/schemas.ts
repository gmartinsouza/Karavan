import { z } from 'zod';
import { paginationQuery } from '../../shared/pagination.js';

const dateTime = z.iso.datetime({ offset: true });

export const fuelingParams = z.object({ vehicleId: z.uuid(), fuelingId: z.uuid() });

export const listFuelingsQuery = paginationQuery.extend({
  from: dateTime.optional().describe('início do período, inclusivo'),
  to: dateTime.optional().describe('fim do período, exclusivo'),
});

export const createFuelingBody = z.object({
  filledAt: dateTime.meta({ example: '2026-11-20T18:30:00-03:00' }),
  liters: z.number().positive().max(500).meta({ example: 41.237 }),
  pricePerLiter: z.number().positive().max(50).meta({ example: 6.29 }),
  totalCost: z
    .number()
    .positive()
    .optional()
    .describe('valor cobrado pela bomba; se omitido, é calculado')
    .meta({ example: 259.38 }),
  odometerKm: z.number().int().min(0).meta({ example: 54_210 }),
  station: z.string().trim().min(1).max(120).optional().meta({ example: 'Posto Trevo' }),
  fullTank: z.boolean().describe('tanque completado até o fim'),
});

export const fuelingResponse = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  filledAt: z.iso.datetime(),
  liters: z.number(),
  pricePerLiter: z.number(),
  totalCost: z.number(),
  odometerKm: z.number().int(),
  station: z.string().nullable(),
  fullTank: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type CreateFuelingInput = z.infer<typeof createFuelingBody>;
export type ListFuelingsOptions = z.infer<typeof listFuelingsQuery>;
