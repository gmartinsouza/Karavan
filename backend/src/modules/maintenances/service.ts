import { roundTo } from '../../domain/numbers.js';
import type { Maintenance } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { decodeCursor, toPage, type Page } from '../../shared/pagination.js';
import { findOwnedVehicle, lockOwnedVehicle, raiseOdometer } from '../vehicles/ownership.js';
import type { CreateMaintenanceInput } from './schemas.js';

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface MaintenanceService {
  list(
    userId: string,
    vehicleId: string,
    options: { limit: number; cursor?: string | undefined },
  ): Promise<Page<Maintenance>>;
  create(userId: string, vehicleId: string, input: CreateMaintenanceInput): Promise<Maintenance>;
  remove(userId: string, vehicleId: string, maintenanceId: string): Promise<void>;
}

export function createMaintenanceService(deps: {
  database: Database;
  now?: () => Date;
}): MaintenanceService {
  const { database } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    async list(userId, vehicleId, { limit, cursor }) {
      await findOwnedVehicle(database, userId, vehicleId);
      const after = cursor ? decodeCursor(cursor) : undefined;
      const afterDate = after ? new Date(after.sortValue) : undefined;

      const rows = await database.maintenance.findMany({
        where: {
          vehicleId,
          ...(after && afterDate
            ? {
                OR: [
                  { performedAt: { lt: afterDate } },
                  { performedAt: afterDate, id: { lt: after.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });

      return toPage(rows, limit, (maintenance) => ({
        sortValue: maintenance.performedAt.toISOString(),
        id: maintenance.id,
      }));
    },

    async create(userId, vehicleId, input) {
      const performedAt = new Date(input.performedAt);
      if (performedAt.getTime() > now().getTime() + FUTURE_TOLERANCE_MS) {
        throw problems.unprocessable('A data da manutenção não pode estar no futuro.');
      }

      return database.$transaction(async (transaction) => {
        const vehicle = await lockOwnedVehicle(transaction, userId, vehicleId);
        const maintenance = await transaction.maintenance.create({
          data: {
            vehicleId,
            kind: input.kind,
            item: input.item,
            performedAt,
            odometerKm: input.odometerKm,
            cost: roundTo(input.cost, 2),
            workshop: input.workshop ?? null,
            notes: input.notes ?? null,
          },
        });
        await raiseOdometer(transaction, vehicle, input.odometerKm);
        return maintenance;
      });
    },

    async remove(userId, vehicleId, maintenanceId) {
      await findOwnedVehicle(database, userId, vehicleId);
      const { count } = await database.maintenance.deleteMany({
        where: { id: maintenanceId, vehicleId },
      });
      if (count === 0) {
        throw problems.notFound('Manutenção não encontrada.');
      }
    },
  };
}
