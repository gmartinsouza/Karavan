import { normalizePlate } from '../../domain/plate.js';
import {
  canChangeOdometer,
  isValidVehicleYear,
  OLDEST_SUPPORTED_YEAR,
} from '../../domain/vehicle.js';
import { Prisma, type Vehicle } from '../../generated/prisma/client.js';
import type { Database } from '../../shared/database.js';
import { problems } from '../../shared/errors.js';
import { withoutUndefined } from '../../shared/objects.js';
import { decodeCursor, toPage, type Page } from '../../shared/pagination.js';
import { findOwnedVehicle } from './ownership.js';
import type { CreateVehicleInput, UpdateVehicleInput } from './schemas.js';

export interface VehicleService {
  list(
    userId: string,
    options: { limit: number; cursor?: string | undefined },
  ): Promise<Page<Vehicle>>;
  get(userId: string, vehicleId: string): Promise<Vehicle>;
  create(userId: string, input: CreateVehicleInput): Promise<Vehicle>;
  update(userId: string, vehicleId: string, input: UpdateVehicleInput): Promise<Vehicle>;
  remove(userId: string, vehicleId: string): Promise<void>;
}

function validPlateOrFail(plate: string) {
  const normalized = normalizePlate(plate);
  if (!normalized) {
    throw problems.unprocessable('Placa fora do padrão. Use ABC1234 ou ABC1D23.');
  }
  return normalized;
}

function validYearOrFail(year: number, now: Date) {
  if (!isValidVehicleYear(year, now)) {
    throw problems.unprocessable(
      `Ano precisa estar entre ${OLDEST_SUPPORTED_YEAR} e ${now.getUTCFullYear() + 1}.`,
    );
  }
  return year;
}

function rethrowDuplicatePlate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw problems.conflict('Você já tem um veículo com esta placa.');
  }
  throw error;
}

export function createVehicleService(deps: {
  database: Database;
  now?: () => Date;
}): VehicleService {
  const { database } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    async list(userId, { limit, cursor }) {
      const after = cursor ? decodeCursor(cursor) : undefined;
      const rows = await database.vehicle.findMany({
        where: { userId, ...(after ? { id: { lt: after.id } } : {}) },
        orderBy: { id: 'desc' },
        take: limit + 1,
      });
      return toPage(rows, limit, (vehicle) => ({ sortValue: vehicle.id, id: vehicle.id }));
    },

    async get(userId, vehicleId) {
      const vehicle = await database.vehicle.findFirst({ where: { id: vehicleId, userId } });
      if (!vehicle) {
        throw problems.notFound('Veículo não encontrado.');
      }
      return vehicle;
    },

    async create(userId, input) {
      try {
        return await database.vehicle.create({
          data: {
            ...input,
            userId,
            plate: validPlateOrFail(input.plate),
            year: validYearOrFail(input.year, now()),
          },
        });
      } catch (error) {
        rethrowDuplicatePlate(error);
      }
    },

    async update(userId, vehicleId, input) {
      const current = await findOwnedVehicle(database, userId, vehicleId);
      if (
        input.odometerKm !== undefined &&
        !canChangeOdometer(current.odometerKm, input.odometerKm)
      ) {
        throw problems.unprocessable(
          `O odômetro não pode voltar. Valor atual: ${current.odometerKm} km.`,
        );
      }
      try {
        return await database.vehicle.update({
          where: { id: vehicleId },
          data: {
            ...withoutUndefined(input),
            ...(input.plate === undefined ? {} : { plate: validPlateOrFail(input.plate) }),
            ...(input.year === undefined ? {} : { year: validYearOrFail(input.year, now()) }),
          },
        });
      } catch (error) {
        rethrowDuplicatePlate(error);
      }
    },

    async remove(userId, vehicleId) {
      const { count } = await database.vehicle.deleteMany({ where: { id: vehicleId, userId } });
      if (count === 0) {
        throw problems.notFound('Veículo não encontrado.');
      }
    },
  };
}
