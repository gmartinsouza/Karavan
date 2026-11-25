import { z } from 'zod';

const dateTime = z.iso.datetime({ offset: true });

export const statsQuery = z.object({
  from: dateTime.optional().describe('início do período, inclusivo'),
  to: dateTime.optional().describe('fim do período, exclusivo'),
});

export const statsResponse = z.object({
  fuelingCount: z.number().int(),
  totalLiters: z.number(),
  totalFuelCost: z.number(),
  totalMaintenanceCost: z.number(),
  distanceKm: z.number().int().describe('km medidos entre tanques cheios'),
  averageKmPerLiter: z.number().nullable(),
  costPerKm: z.number().nullable().describe('custo de combustível por km'),
  consumption: z.array(
    z.object({
      fuelingId: z.uuid(),
      filledAt: z.iso.datetime(),
      distanceKm: z.number().int(),
      liters: z.number(),
      kmPerLiter: z.number(),
      costPerKm: z.number(),
    }),
  ),
  monthly: z.array(
    z.object({
      month: z.string().meta({ example: '2026-03' }),
      fuelCost: z.number(),
      maintenanceCost: z.number(),
      liters: z.number(),
    }),
  ),
});

export type StatsQuery = z.infer<typeof statsQuery>;
export type StatsResponse = z.infer<typeof statsResponse>;
