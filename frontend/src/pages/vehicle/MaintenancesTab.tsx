import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import { ErrorMessage } from '../../components/ErrorMessage';
import { formatDate, formatKm, formatMoney, fromInputDateTime, nowForInput } from '../../format';
import type { Maintenance, Page, Vehicle } from '../../types';
import { errorMessage, useApi } from '../../useApi';

function emptyForm(vehicle: Vehicle) {
  return {
    kind: 'SERVICE' as Maintenance['kind'],
    item: '',
    performedAt: nowForInput(),
    odometerKm: String(vehicle.odometerKm),
    cost: '',
    workshop: '',
    notes: '',
  };
}

export function MaintenancesTab({ vehicle, onChange }: { vehicle: Vehicle; onChange: () => void }) {
  const basePath = `/vehicles/${vehicle.id}/maintenances`;
  const { data, error, reload } = useApi<Page<Maintenance>>(`${basePath}?limit=100`);
  const [form, setForm] = useState(() => emptyForm(vehicle));
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post(basePath, {
        kind: form.kind,
        item: form.item,
        performedAt: fromInputDateTime(form.performedAt),
        odometerKm: Number(form.odometerKm),
        cost: Number(form.cost),
        // campos opcionais só vão se foram preenchidos
        ...(form.workshop ? { workshop: form.workshop } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      setForm(emptyForm(vehicle));
      await reload();
      onChange();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function handleDelete(maintenance: Maintenance) {
    if (!confirm(`Apagar "${maintenance.item}"?`)) return;
    await api.delete(`${basePath}/${maintenance.id}`);
    await reload();
  }

  return (
    <>
      <form
        className="card grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-end gap-x-4 gap-y-3"
        onSubmit={handleSubmit}
      >
        <h2 className="col-span-full">Nova manutenção</h2>
        <label>
          Tipo
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as Maintenance['kind'] })}
          >
            <option value="SERVICE">Serviço</option>
            <option value="PART">Troca de peça</option>
          </select>
        </label>
        <label>
          O que foi feito
          <input
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
            placeholder="Troca de óleo"
            required
            minLength={2}
          />
        </label>
        <label>
          Data
          <input
            type="datetime-local"
            value={form.performedAt}
            onChange={(e) => setForm({ ...form, performedAt: e.target.value })}
            required
          />
        </label>
        <label>
          Odômetro (km)
          <input
            type="number"
            min="0"
            value={form.odometerKm}
            onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
            required
          />
        </label>
        <label>
          Custo (R$)
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
            required
          />
        </label>
        <label>
          Oficina
          <input
            value={form.workshop}
            onChange={(e) => setForm({ ...form, workshop: e.target.value })}
          />
        </label>
        <label className="col-span-full">
          Observações
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </label>
        <ErrorMessage message={formError} />
        <div className="col-span-full mt-2 flex items-center gap-3">
          <button type="submit">Registrar</button>
        </div>
      </form>

      <ErrorMessage message={error} />
      {data && data.items.length === 0 && (
        <p className="text-gray-500">Nenhuma manutenção registrada.</p>
      )}
      {data && data.items.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Item</th>
                <th>Tipo</th>
                <th>Oficina</th>
                <th className="text-right tabular-nums">Odômetro</th>
                <th className="text-right tabular-nums">Custo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((maintenance) => (
                <tr key={maintenance.id}>
                  <td>{formatDate(maintenance.performedAt)}</td>
                  <td>
                    {maintenance.item}
                    {maintenance.notes && (
                      <div className="text-sm text-gray-500">{maintenance.notes}</div>
                    )}
                  </td>
                  <td>{maintenance.kind === 'PART' ? 'Peça' : 'Serviço'}</td>
                  <td>{maintenance.workshop ?? '-'}</td>
                  <td className="text-right tabular-nums">{formatKm(maintenance.odometerKm)}</td>
                  <td className="text-right tabular-nums">{formatMoney(maintenance.cost)}</td>
                  <td>
                    <button
                      className="bg-transparent p-0 text-red-600 hover:bg-transparent hover:underline"
                      onClick={() => handleDelete(maintenance)}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
