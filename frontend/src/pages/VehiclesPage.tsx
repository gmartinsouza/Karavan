import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatKm, fuelTypeLabels } from '../format';
import type { FuelType, Page, Vehicle } from '../types';
import { errorMessage, useApi } from '../useApi';

const emptyForm = {
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  plate: '',
  fuelType: 'FLEX' as FuelType,
  odometerKm: '0',
};

export function VehiclesPage() {
  const { data, error, reload } = useApi<Page<Vehicle>>('/vehicles?limit=100');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      // os inputs guardam texto; a API espera número em year e odometerKm
      await api.post('/vehicles', {
        ...form,
        year: Number(form.year),
        odometerKm: Number(form.odometerKm),
      });
      setForm(emptyForm);
      setShowForm(false);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    if (!confirm(`Apagar ${vehicle.brand} ${vehicle.model} e todo o histórico dele?`)) {
      return;
    }
    await api.delete(`/vehicles/${vehicle.id}`);
    await reload();
  }

  return (
    <>
      <div className="page-header">
        <h1>Veículos</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo veículo'}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>
            Marca
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              required
            />
          </label>
          <label>
            Modelo
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </label>
          <label>
            Ano
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
            />
          </label>
          <label>
            Placa
            <input
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="ABC1D23"
              required
            />
          </label>
          <label>
            Combustível
            <select
              value={form.fuelType}
              onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
            >
              {Object.entries(fuelTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Odômetro atual (km)
            <input
              type="number"
              min={0}
              value={form.odometerKm}
              onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
              required
            />
          </label>
          <ErrorMessage message={formError} />
          <button type="submit">Salvar veículo</button>
        </form>
      )}

      <ErrorMessage message={error} />
      {data && data.items.length === 0 && (
        <p className="muted">Nenhum veículo ainda. Cadastre o primeiro.</p>
      )}

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
            <div className="actions">
              <Link className="button" to={`/veiculos/${vehicle.id}`}>
                Abrir
              </Link>
              <button className="danger" onClick={() => handleDelete(vehicle)}>
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
