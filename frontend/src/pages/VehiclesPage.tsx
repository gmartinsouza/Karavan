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
      <div className="mb-4 flex items-center justify-between">
        <h1>Veículos</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo veículo'}
        </button>
      </div>

      {showForm && (
        <form
          className="card grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-end gap-x-4 gap-y-3"
          onSubmit={handleSubmit}
        >
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
        <p className="text-gray-500">Nenhum veículo ainda. Cadastre o primeiro.</p>
      )}

      <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {data?.items.map((vehicle) => (
          <div className="card mb-0" key={vehicle.id}>
            <h2>
              <Link to={`/veiculos/${vehicle.id}`}>
                {vehicle.brand} {vehicle.model}
              </Link>
            </h2>
            <p className="text-gray-500">
              {vehicle.year} · {vehicle.plate} · {fuelTypeLabels[vehicle.fuelType]}
            </p>
            <p>{formatKm(vehicle.odometerKm)}</p>
            <div className="mt-2 flex items-center gap-3">
              <Link
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 hover:no-underline"
                to={`/veiculos/${vehicle.id}`}
              >
                Abrir
              </Link>
              <button className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(vehicle)}>
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
