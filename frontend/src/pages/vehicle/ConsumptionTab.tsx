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
      <div className="stat-row">
        <div className="card stat">
          <span className="stat-label">Média</span>
          <span className="stat-value">
            {stats.averageKmPerLiter === null
              ? '-'
              : `${formatNumber(stats.averageKmPerLiter)} km/l`}
          </span>
        </div>
        <div className="card stat">
          <span className="stat-label">Combustível por km</span>
          <span className="stat-value">
            {stats.costPerKm === null ? '-' : formatMoney(stats.costPerKm)}
          </span>
        </div>
        <div className="card stat">
          <span className="stat-label">Gasto com combustível</span>
          <span className="stat-value">{formatMoney(stats.totalFuelCost)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Gasto com manutenção</span>
          <span className="stat-value">{formatMoney(stats.totalMaintenanceCost)}</span>
        </div>
      </div>

      <p className="muted">
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
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Litros</th>
              <th className="num">Combustível</th>
              <th className="num">Manutenção</th>
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((month) => (
              <tr key={month.month}>
                <td>{formatMonth(month.month)}</td>
                <td className="num">{formatNumber(month.liters)}</td>
                <td className="num">{formatMoney(month.fuelCost)}</td>
                <td className="num">{formatMoney(month.maintenanceCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Consumo por trecho</h2>
      {stats.consumption.length === 0 ? (
        <p className="muted">São necessários pelo menos dois abastecimentos com tanque cheio.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Até</th>
                <th className="num">Distância</th>
                <th className="num">Litros</th>
                <th className="num">km/l</th>
                <th className="num">R$/km</th>
              </tr>
            </thead>
            <tbody>
              {/* mais recentes primeiro */}
              {[...stats.consumption].reverse().map((segment) => (
                <tr key={segment.fuelingId}>
                  <td>{formatDate(segment.filledAt)}</td>
                  <td className="num">{formatKm(segment.distanceKm)}</td>
                  <td className="num">{formatNumber(segment.liters)}</td>
                  <td className="num">{formatNumber(segment.kmPerLiter)}</td>
                  <td className="num">{formatMoney(segment.costPerKm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
