import { z } from 'zod';

export const maintenanceKindSchema = z
  .enum(['PART', 'SERVICE'])
  .describe('PART = troca de peça, SERVICE = serviço');

export const maintenanceParams = z.object({ vehicleId: z.uuid(), maintenanceId: z.uuid() });

export const createMaintenanceBody = z.object({
  kind: maintenanceKindSchema,
  item: z.string().trim().min(2).max(120).meta({ example: 'Troca de óleo e filtro de óleo' }),
  performedAt: z.iso.datetime({ offset: true }).meta({ example: '2026-11-18T09:00:00-03:00' }),
  odometerKm: z.number().int().min(0).meta({ example: 54_100 }),
  cost: z.number().min(0).max(1_000_000).meta({ example: 349.9 }),
  workshop: z.string().trim().min(1).max(120).optional().meta({ example: 'Mecânica Lima' }),
  notes: z.string().trim().max(2_000).optional().meta({ example: 'Óleo 5W30 sintético' }),
});

export const maintenanceResponse = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  kind: maintenanceKindSchema,
  item: z.string(),
  performedAt: z.iso.datetime(),
  odometerKm: z.number().int(),
  cost: z.number(),
  workshop: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceBody>;
