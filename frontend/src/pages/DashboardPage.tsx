import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorMessage } from '../components/ErrorMessage';
import { MonthlyChart } from '../components/MonthlyChart';
import { ReviewStatus } from '../components/ReviewStatus';
import { formatKm, formatMoney, formatNumber } from '../format';
import type { Page, Review, Stats, Vehicle } from '../types';
import { errorMessage } from '../useApi';

// Tudo o que o painel precisa saber de um veículo
interface VehicleSummary {
  vehicle: Vehicle;
  stats: Stats;
  reviews: Review[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<VehicleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const vehicles = await api.get<Page<Vehicle>>('/vehicles?limit=100');
      // Para cada veículo, busca estatísticas e revisões ao mesmo tempo (Promise.all)
      const result = await Promise.all(
        vehicles.items.map(async (vehicle) => {
          const [stats, reviews] = await Promise.all([
            api.get<Stats>(`/vehicles/${vehicle.id}/stats`),
            api.get<Review[]>(`/vehicles/${vehicle.id}/reviews`),
          ]);
          return { vehicle, stats, reviews };
        }),
      );
      setSummaries(result);
    }
    load().catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  if (error) return <ErrorMessage message={error} />;
  if (!summaries) return <p>Carregando...</p>;

  const pendingReviews = summaries.flatMap(({ vehicle, reviews }) =>
    reviews.filter((review) => review.status !== 'ok').map((review) => ({ vehicle, review })),
  );
  const totalFuel = summaries.reduce((sum, item) => sum + item.stats.totalFuelCost, 0);
  const totalMaintenance = summaries.reduce(
    (sum, item) => sum + item.stats.totalMaintenanceCost,
    0,
  );

  return (
    <>
      <h1>Olá, {user?.name.split(' ')[0]}</h1>

      {summaries.length === 0 ? (
        <p>
          Você ainda não tem veículos. <Link to="/veiculos">Cadastre o primeiro</Link>.
        </p>
      ) : (
        <>
          <div className="stat-row">
            <div className="card stat">
              <span className="stat-label">Veículos</span>
              <span className="stat-value">{summaries.length}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">Total em combustível</span>
              <span className="stat-value">{formatMoney(totalFuel)}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">Total em manutenção</span>
              <span className="stat-value">{formatMoney(totalMaintenance)}</span>
            </div>
            <div className="card stat">
              <span className="stat-label">Revisões pendentes</span>
              <span className="stat-value">{pendingReviews.length}</span>
            </div>
          </div>

          {pendingReviews.length > 0 && (
            <div className="card">
              <h2>Revisões que pedem atenção</h2>
              <ul className="plain-list">
                {pendingReviews.map(({ vehicle, review }) => (
                  <li key={review.id}>
                    <ReviewStatus status={review.status} /> {review.name} ·{' '}
                    <Link to={`/veiculos/${vehicle.id}`}>
                      {vehicle.brand} {vehicle.model}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="cards">
            {summaries.map(({ vehicle, stats }) => (
              <div className="card" key={vehicle.id}>
                <h2>
                  <Link to={`/veiculos/${vehicle.id}`}>
                    {vehicle.brand} {vehicle.model}
                  </Link>
                </h2>
                <p className="muted">
                  {vehicle.plate} · {formatKm(vehicle.odometerKm)}
                </p>
                <p>
                  Média:{' '}
                  <strong>
                    {stats.averageKmPerLiter === null
                      ? '-'
                      : `${formatNumber(stats.averageKmPerLiter)} km/l`}
                  </strong>{' '}
                  · Custo por km:{' '}
                  <strong>{stats.costPerKm === null ? '-' : formatMoney(stats.costPerKm)}</strong>
                </p>
                {/* só os últimos 6 meses, para caber no cartão */}
                <MonthlyChart
                  title="Combustível nos últimos meses"
                  data={stats.monthly
                    .slice(-6)
                    .map((month) => ({ month: month.month, value: month.fuelCost }))}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
