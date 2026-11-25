import type { Prisma } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';

type Client = Database | Prisma.TransactionClient;

export interface OwnedVehicle {
  id: string;
  odometerKm: number;
}

export async function findOwnedVehicle(
  client: Client,
  userId: string,
  vehicleId: string,
): Promise<OwnedVehicle> {
  const vehicle = await client.vehicle.findFirst({
    where: { id: vehicleId, userId },
    select: { id: true, odometerKm: true },
  });
  if (!vehicle) {
    throw problems.notFound('Veículo não encontrado.');
  }
  return vehicle;
}

export async function lockOwnedVehicle(
  transaction: Prisma.TransactionClient,
  userId: string,
  vehicleId: string,
): Promise<OwnedVehicle> {
  const rows = await transaction.$queryRaw<{ id: string; odometer_km: number }[]>`
    SELECT id, odometer_km
    FROM vehicles
    WHERE id = ${vehicleId}::uuid AND user_id = ${userId}::uuid
    FOR UPDATE`;
  const row = rows[0];
  if (!row) {
    throw problems.notFound('Veículo não encontrado.');
  }
  return { id: row.id, odometerKm: row.odometer_km };
}

export async function raiseOdometer(
  transaction: Prisma.TransactionClient,
  vehicle: OwnedVehicle,
  odometerKm: number,
) {
  if (odometerKm > vehicle.odometerKm) {
    await transaction.vehicle.update({ where: { id: vehicle.id }, data: { odometerKm } });
  }
}
