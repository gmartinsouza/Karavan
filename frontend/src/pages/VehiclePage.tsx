import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatKm, fuelTypeLabels } from '../format';
import type { Vehicle } from '../types';
import { useApi } from '../useApi';
import { FuelingsTab } from './vehicle/FuelingsTab';

const tabs = {
  fuelings: 'Abastecimentos',
};
type Tab = keyof typeof tabs;

// Tela de um veículo: cabeçalho com os dados e uma aba para cada assunto.
export function VehiclePage() {
  const { vehicleId = '' } = useParams();
  const { data: vehicle, error, reload } = useApi<Vehicle>(`/vehicles/${vehicleId}`);
  const [tab, setTab] = useState<Tab>('fuelings');

  if (error) {
    return <ErrorMessage message={error} />;
  }
  if (!vehicle) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <p>
        <Link to="/veiculos">← Veículos</Link>
      </p>
      <div className="page-header">
        <div>
          <h1>
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="muted">
            {vehicle.year} · {vehicle.plate} · {fuelTypeLabels[vehicle.fuelType]} ·{' '}
            {formatKm(vehicle.odometerKm)}
          </p>
        </div>
      </div>

      <div className="tabs">
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <button
            key={key}
            className={tab === key ? 'tab active' : 'tab'}
            onClick={() => setTab(key)}
          >
            {tabs[key]}
          </button>
        ))}
      </div>

      {/* onChange recarrega o veículo, porque um lançamento novo pode subir o odômetro */}
      {tab === 'fuelings' && <FuelingsTab vehicle={vehicle} onChange={reload} />}
    </>
  );
}
