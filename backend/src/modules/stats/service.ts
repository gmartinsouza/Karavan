import { computeConsumption, summarizeConsumption } from '../../domain/consumption.js';
import { roundTo } from '../../domain/numbers.js';
import type { Database } from '../../shared/database.js';
import { findOwnedVehicle } from '../vehicles/ownership.js';
import type { StatsQuery, StatsResponse } from './schemas.js';

export interface StatsService {
  forVehicle(userId: string, vehicleId: string, period: StatsQuery): Promise<StatsResponse>;
}

interface MonthlyRow {
  month: string;
  total: number;
  liters: number;
}

export function createStatsService(deps: { database: Database }): StatsService {
  const { database } = deps;

  return {
    async forVehicle(userId, vehicleId, { from, to }) {
      await findOwnedVehicle(database, userId, vehicleId);
      // sem período informado, pega tudo (de 1970 até bem longe no futuro)
      const start = from ? new Date(from) : new Date(0);
      const end = to ? new Date(to) : new Date('9999-12-31T00:00:00Z');

      const fuelings = await database.fueling.findMany({
        where: { vehicleId, filledAt: { gte: start, lt: end } },
        orderBy: [{ filledAt: 'asc' }, { id: 'asc' }],
      });

      // Decimal do Prisma vira number para o cálculo
      const segments = computeConsumption(
        fuelings.map((fueling) => ({
          id: fueling.id,
          filledAt: fueling.filledAt,
          odometerKm: fueling.odometerKm,
          liters: fueling.liters.toNumber(),
          totalCost: fueling.totalCost.toNumber(),
          fullTank: fueling.fullTank,
        })),
      );
      const summary = summarizeConsumption(segments);

      // Totais por mês com GROUP BY no próprio Postgres.
      // O mês é calculado no fuso de São Paulo: um abastecimento às 22h do dia 31
      // pertence ao mês 31, e não ao mês seguinte (que seria o caso em UTC).
      const [fuelByMonth, maintenanceByMonth, maintenanceTotal] = await Promise.all([
        database.$queryRaw<MonthlyRow[]>`
          SELECT to_char(filled_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
                 SUM(total_cost)::float8 AS total,
                 SUM(liters)::float8 AS liters
          FROM fuelings
          WHERE vehicle_id = ${vehicleId}::uuid AND filled_at >= ${start} AND filled_at < ${end}
          GROUP BY month`,
        database.$queryRaw<MonthlyRow[]>`
          SELECT to_char(performed_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
                 SUM(cost)::float8 AS total,
                 0::float8 AS liters
          FROM maintenances
          WHERE vehicle_id = ${vehicleId}::uuid AND performed_at >= ${start} AND performed_at < ${end}
          GROUP BY month`,
        database.maintenance.aggregate({
          where: { vehicleId, performedAt: { gte: start, lt: end } },
          _sum: { cost: true },
        }),
      ]);

      // junta as duas listas num mapa "mês -> valores"
      const months = new Map<string, StatsResponse['monthly'][number]>();
      function monthEntry(month: string) {
        const entry = months.get(month) ?? { month, fuelCost: 0, maintenanceCost: 0, liters: 0 };
        months.set(month, entry);
        return entry;
      }
      for (const row of fuelByMonth) {
        const entry = monthEntry(row.month);
        entry.fuelCost = roundTo(row.total, 2);
        entry.liters = roundTo(row.liters, 3);
      }
      for (const row of maintenanceByMonth) {
        monthEntry(row.month).maintenanceCost = roundTo(row.total, 2);
      }

      return {
        fuelingCount: fuelings.length,
        totalLiters: roundTo(
          fuelings.reduce((sum, fueling) => sum + fueling.liters.toNumber(), 0),
          3,
        ),
        totalFuelCost: roundTo(
          fuelings.reduce((sum, fueling) => sum + fueling.totalCost.toNumber(), 0),
          2,
        ),
        totalMaintenanceCost: maintenanceTotal._sum.cost?.toNumber() ?? 0,
        distanceKm: summary.distanceKm,
        averageKmPerLiter: summary.averageKmPerLiter,
        costPerKm: summary.costPerKm,
        consumption: segments.map((segment) => ({
          fuelingId: segment.fuelingId,
          filledAt: segment.filledAt.toISOString(),
          distanceKm: segment.distanceKm,
          liters: segment.liters,
          kmPerLiter: segment.kmPerLiter,
          costPerKm: segment.costPerKm,
        })),
        monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
  };
}
