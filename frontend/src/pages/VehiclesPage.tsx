import { Link } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatKm, fuelTypeLabels } from '../format';
import type { Page, Vehicle } from '../types';
import { useApi } from '../useApi';

export function VehiclesPage() {
  const { data, error } = useApi<Page<Vehicle>>('/vehicles?limit=100');

  return (
    <>
      <div className="page-header">
        <h1>Veículos</h1>
      </div>

      <ErrorMessage message={error} />
      {data && data.items.length === 0 && <p className="muted">Nenhum veículo ainda.</p>}

      <div className="cards">
        {data?.items.map((vehicle) => (
          <div className="card" key={vehicle.id}>
            <h2>
              <Link to={`/veiculos/${vehicle.id}`}>
                {vehicle.brand} {vehicle.model}
              </Link>
            </h2>
            <p className="muted">
              {vehicle.year} · {vehicle.plate} · {fuelTypeLabels[vehicle.fuelType]}
            </p>
            <p>{formatKm(vehicle.odometerKm)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
