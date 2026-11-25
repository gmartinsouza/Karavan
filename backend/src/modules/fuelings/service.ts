import {
  computeTotalCost,
  findOdometerConflict,
  isTotalCostConsistent,
} from '../../domain/fueling.js';
import { roundTo } from '../../domain/numbers.js';
import type { Fueling, Prisma } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { decodeCursor, toPage, type Page } from '../../shared/pagination.js';
import { findOwnedVehicle, lockOwnedVehicle, raiseOdometer } from '../vehicles/ownership.js';
import type { CreateFuelingInput, ListFuelingsOptions, UpdateFuelingInput } from './schemas.js';

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface FuelingService {
  list(userId: string, vehicleId: string, options: ListFuelingsOptions): Promise<Page<Fueling>>;
  create(userId: string, vehicleId: string, input: CreateFuelingInput): Promise<Fueling>;
  update(
    userId: string,
    vehicleId: string,
    fuelingId: string,
    input: UpdateFuelingInput,
  ): Promise<Fueling>;
  remove(userId: string, vehicleId: string, fuelingId: string): Promise<void>;
}

// Se o total foi informado, confere com litros x preço; se não, calcula.
function resolveTotalCost(liters: number, pricePerLiter: number, informed: number | undefined) {
  if (informed !== undefined && !isTotalCostConsistent(liters, pricePerLiter, informed)) {
    throw problems.unprocessable(
      `Total informado não bate com litros x preço (R$ ${computeTotalCost(liters, pricePerLiter).toFixed(2)}).`,
    );
  }
  return roundTo(informed ?? computeTotalCost(liters, pricePerLiter), 2);
}

// O odômetro tem que ficar entre o abastecimento anterior e o seguinte (pela data).
// ignoreId serve para a edição: o próprio abastecimento não conta como vizinho.
async function checkOdometerNeighbors(
  transaction: Prisma.TransactionClient,
  vehicleId: string,
  filledAt: Date,
  odometerKm: number,
  ignoreId?: string,
) {
  const others = ignoreId ? { id: { not: ignoreId } } : {};
  const [previous, next] = await Promise.all([
    transaction.fueling.findFirst({
      where: { vehicleId, ...others, filledAt: { lte: filledAt } },
      orderBy: [{ filledAt: 'desc' }, { id: 'desc' }],
      select: { odometerKm: true },
    }),
    transaction.fueling.findFirst({
      where: { vehicleId, ...others, filledAt: { gt: filledAt } },
      orderBy: [{ filledAt: 'asc' }, { id: 'asc' }],
      select: { odometerKm: true },
    }),
  ]);
  const conflict = findOdometerConflict(odometerKm, previous, next);
  if (conflict) {
    throw problems.unprocessable(conflict);
  }
}

export function createFuelingService(deps: {
  database: Database;
  now?: () => Date;
}): FuelingService {
  const { database } = deps;
  const now = deps.now ?? (() => new Date());

  function rejectFutureDate(filledAt: Date) {
    if (filledAt.getTime() > now().getTime() + FUTURE_TOLERANCE_MS) {
      throw problems.unprocessable('A data do abastecimento não pode estar no futuro.');
    }
  }

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
      rejectFutureDate(filledAt);
      const liters = roundTo(input.liters, 3);
      const pricePerLiter = roundTo(input.pricePerLiter, 3);
      const totalCost = resolveTotalCost(liters, pricePerLiter, input.totalCost);

      return database.$transaction(async (transaction) => {
        const vehicle = await lockOwnedVehicle(transaction, userId, vehicleId);
        await checkOdometerNeighbors(transaction, vehicleId, filledAt, input.odometerKm);

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

    async update(userId, vehicleId, fuelingId, input) {
      return database.$transaction(async (transaction) => {
        const vehicle = await lockOwnedVehicle(transaction, userId, vehicleId);
        const current = await transaction.fueling.findFirst({
          where: { id: fuelingId, vehicleId },
        });
        if (!current) {
          throw problems.notFound('Abastecimento não encontrado.');
        }

        // Junta o que foi enviado com o que já estava salvo.
        const filledAt = input.filledAt ? new Date(input.filledAt) : current.filledAt;
        rejectFutureDate(filledAt);
        const liters = roundTo(input.liters ?? current.liters.toNumber(), 3);
        const pricePerLiter = roundTo(input.pricePerLiter ?? current.pricePerLiter.toNumber(), 3);
        const odometerKm = input.odometerKm ?? current.odometerKm;

        // Se litros ou preço mudaram e o total não veio, o total é recalculado.
        const priceChanged = input.liters !== undefined || input.pricePerLiter !== undefined;
        const totalCost =
          input.totalCost === undefined && !priceChanged
            ? current.totalCost.toNumber()
            : resolveTotalCost(liters, pricePerLiter, input.totalCost);

        await checkOdometerNeighbors(transaction, vehicleId, filledAt, odometerKm, fuelingId);

        const fueling = await transaction.fueling.update({
          where: { id: fuelingId },
          data: {
            filledAt,
            liters,
            pricePerLiter,
            totalCost,
            odometerKm,
            ...(input.station === undefined ? {} : { station: input.station }),
            ...(input.fullTank === undefined ? {} : { fullTank: input.fullTank }),
          },
        });
        // O odômetro do veículo só sobe; corrigir para baixo não o faz voltar.
        await raiseOdometer(transaction, vehicle, odometerKm);
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
