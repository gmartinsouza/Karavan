import {
  computeTotalCost,
  findOdometerConflict,
  isTotalCostConsistent,
} from '../../domain/fueling.js';
import { roundTo } from '../../domain/numbers.js';
import type { Fueling } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { decodeCursor, toPage, type Page } from '../../shared/pagination.js';
import { findOwnedVehicle, lockOwnedVehicle, raiseOdometer } from '../vehicles/ownership.js';
import type { CreateFuelingInput, ListFuelingsOptions } from './schemas.js';

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface FuelingService {
  list(userId: string, vehicleId: string, options: ListFuelingsOptions): Promise<Page<Fueling>>;
  create(userId: string, vehicleId: string, input: CreateFuelingInput): Promise<Fueling>;
  remove(userId: string, vehicleId: string, fuelingId: string): Promise<void>;
}

export function createFuelingService(deps: {
  database: Database;
  now?: () => Date;
}): FuelingService {
  const { database } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    async list(userId, vehicleId, { limit, cursor, from, to }) {
      await findOwnedVehicle(database, userId, vehicleId);
      const after = cursor ? decodeCursor(cursor) : undefined;
      const afterDate = after ? new Date(after.sortValue) : undefined;

      const rows = await database.fueling.findMany({
        where: {
          vehicleId,
          filledAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lt: new Date(to) } : {}),
          },
          ...(after && afterDate
            ? {
                OR: [
                  { filledAt: { lt: afterDate } },
                  { filledAt: afterDate, id: { lt: after.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ filledAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      });

      return toPage(rows, limit, (fueling) => ({
        sortValue: fueling.filledAt.toISOString(),
        id: fueling.id,
      }));
    },

    async create(userId, vehicleId, input) {
      const filledAt = new Date(input.filledAt);
      if (filledAt.getTime() > now().getTime() + FUTURE_TOLERANCE_MS) {
        throw problems.unprocessable('A data do abastecimento não pode estar no futuro.');
      }
      const liters = roundTo(input.liters, 3);
      const pricePerLiter = roundTo(input.pricePerLiter, 3);
      if (
        input.totalCost !== undefined &&
        !isTotalCostConsistent(liters, pricePerLiter, input.totalCost)
      ) {
        throw problems.unprocessable(
          `Total informado não bate com litros x preço (R$ ${computeTotalCost(liters, pricePerLiter).toFixed(2)}).`,
        );
      }
      const totalCost = roundTo(input.totalCost ?? computeTotalCost(liters, pricePerLiter), 2);

      return database.$transaction(async (transaction) => {
        const vehicle = await lockOwnedVehicle(transaction, userId, vehicleId);

        const [previous, next] = await Promise.all([
          transaction.fueling.findFirst({
            where: { vehicleId, filledAt: { lte: filledAt } },
            orderBy: [{ filledAt: 'desc' }, { id: 'desc' }],
            select: { odometerKm: true },
          }),
          transaction.fueling.findFirst({
            where: { vehicleId, filledAt: { gt: filledAt } },
            orderBy: [{ filledAt: 'asc' }, { id: 'asc' }],
            select: { odometerKm: true },
          }),
        ]);
        const conflict = findOdometerConflict(input.odometerKm, previous, next);
        if (conflict) {
          throw problems.unprocessable(conflict);
        }

        const fueling = await transaction.fueling.create({
          data: {
            vehicleId,
            filledAt,
            liters,
            pricePerLiter,
            totalCost,
            odometerKm: input.odometerKm,
            station: input.station ?? null,
            fullTank: input.fullTank,
          },
        });
        await raiseOdometer(transaction, vehicle, input.odometerKm);
        return fueling;
      });
    },

    async remove(userId, vehicleId, fuelingId) {
      await findOwnedVehicle(database, userId, vehicleId);
      const { count } = await database.fueling.deleteMany({ where: { id: fuelingId, vehicleId } });
      if (count === 0) {
        throw problems.notFound('Abastecimento não encontrado.');
      }
    },
  };
}
