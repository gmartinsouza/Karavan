import { z } from 'zod';

export const fuelTypeSchema = z.enum(['GASOLINE', 'ETHANOL', 'FLEX', 'DIESEL', 'CNG', 'ELECTRIC']);

export const vehicleParams = z.object({ vehicleId: z.uuid() });

export const createVehicleBody = z.object({
  brand: z.string().trim().min(1).max(60).meta({ example: 'Fiat' }),
  model: z.string().trim().min(1).max(80).meta({ example: 'Argo Drive 1.3' }),
  year: z.number().int().meta({ example: 2021 }),
  plate: z
    .string()
    .trim()
    .min(7)
    .max(8)
    .describe('padrão antigo (ABC1234) ou Mercosul (ABC1D23); hífen é aceito')
    .meta({ example: 'RTB4E21' }),
  fuelType: fuelTypeSchema,
  odometerKm: z.number().int().min(0).max(3_000_000).meta({ example: 38_420 }),
});

export const updateVehicleBody = createVehicleBody
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'envie pelo menos um campo');

export const vehicleResponse = z.object({
  id: z.uuid(),
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  plate: z.string(),
  fuelType: fuelTypeSchema,
  odometerKm: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleBody>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleBody>;
