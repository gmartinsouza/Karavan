import { MonthlyChart } from '../../components/MonthlyChart';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatKm, formatMoney, formatMonth, formatNumber } from '../../format';
import type { Stats } from '../../types';
import { useApi } from '../../useApi';

// Mostra o que a rota /stats calcula: km/l, custo por km e gastos por mês.
export function ConsumptionTab({ vehicleId }: { vehicleId: string }) {
  const { data: stats, error } = useApi<Stats>(`/vehicles/${vehicleId}/stats`);

  if (error) return <ErrorMessage message={error} />;
  if (!stats) return <p>Carregando...</p>;

  return (
    <>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <div className="card mb-0 flex flex-col gap-1">
          <span className="text-sm text-gray-500">Média</span>
          <span className="text-2xl font-semibold">
            {stats.averageKmPerLiter === null
              ? '-'
              : `${formatNumber(stats.averageKmPerLiter)} km/l`}
          </span>
        </div>
        <div className="card mb-0 flex flex-col gap-1">
          <span className="text-sm text-gray-500">Combustível por km</span>
          <span className="text-2xl font-semibold">
            {stats.costPerKm === null ? '-' : formatMoney(stats.costPerKm)}
          </span>
        </div>
        <div className="card mb-0 flex flex-col gap-1">
          <span className="text-sm text-gray-500">Gasto com combustível</span>
          <span className="text-2xl font-semibold">{formatMoney(stats.totalFuelCost)}</span>
        </div>
        <div className="card mb-0 flex flex-col gap-1">
          <span className="text-sm text-gray-500">Gasto com manutenção</span>
          <span className="text-2xl font-semibold">{formatMoney(stats.totalMaintenanceCost)}</span>
        </div>
      </div>

      <p className="text-gray-500">
        O consumo é medido entre dois abastecimentos com tanque cheio: a distância rodada dividida
        pelos litros colocados no trecho.
      </p>

      <div className="card">
        <MonthlyChart
          title="Gasto com combustível por mês"
          data={stats.monthly.map((month) => ({ month: month.month, value: month.fuelCost }))}
        />
      </div>

      <h2>Gastos por mês</h2>
      <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="text-right tabular-nums">Litros</th>
              <th className="text-right tabular-nums">Combustível</th>
              <th className="text-right tabular-nums">Manutenção</th>
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((month) => (
              <tr key={month.month}>
                <td>{formatMonth(month.month)}</td>
                <td className="text-right tabular-nums">{formatNumber(month.liters)}</td>
                <td className="text-right tabular-nums">{formatMoney(month.fuelCost)}</td>
                <td className="text-right tabular-nums">{formatMoney(month.maintenanceCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Consumo por trecho</h2>
      {stats.consumption.length === 0 ? (
        <p className="text-gray-500">
          São necessários pelo menos dois abastecimentos com tanque cheio.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Até</th>
                <th className="text-right tabular-nums">Distância</th>
                <th className="text-right tabular-nums">Litros</th>
                <th className="text-right tabular-nums">km/l</th>
                <th className="text-right tabular-nums">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {/* mais recentes primeiro */}
              {[...stats.consumption].reverse().map((segment) => (
                <tr key={segment.fuelingId}>
                  <td>{formatDate(segment.filledAt)}</td>
                  <td className="text-right tabular-nums">{formatKm(segment.distanceKm)}</td>
                  <td className="text-right tabular-nums">{formatNumber(segment.liters)}</td>
                  <td className="text-right tabular-nums">{formatNumber(segment.kmPerLiter)}</td>
                  <td className="text-right tabular-nums">{formatMoney(segment.costPerKm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
