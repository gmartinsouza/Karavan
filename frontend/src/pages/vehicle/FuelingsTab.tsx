import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import { ErrorMessage } from '../../components/ErrorMessage';
import {
  formatDateTime,
  formatKm,
  formatMoney,
  formatNumber,
  fromInputDateTime,
  nowForInput,
  toInputDateTime,
} from '../../format';
import type { Fueling, Page, Vehicle } from '../../types';
import { errorMessage } from '../../useApi';

const PAGE_SIZE = 20;

function emptyForm(vehicle: Vehicle) {
  return {
    filledAt: nowForInput(),
    liters: '',
    pricePerLiter: '',
    totalCost: '',
    odometerKm: String(vehicle.odometerKm),
    station: '',
    fullTank: true,
  };
}

export function FuelingsTab({ vehicle, onChange }: { vehicle: Vehicle; onChange: () => void }) {
  const [items, setItems] = useState<Fueling[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyForm(vehicle));
  const [editingId, setEditingId] = useState<string | null>(null); // null = criando um novo
  const [error, setError] = useState<string | null>(null);

  const basePath = `/vehicles/${vehicle.id}/fuelings`;

  // Carrega a primeira página. "Carregar mais" usa o nextCursor para pegar a seguinte.
  const loadFirstPage = useCallback(async () => {
    const page = await api.get<Page<Fueling>>(`${basePath}?limit=${PAGE_SIZE}`);
    setItems(page.items);
    setNextCursor(page.nextCursor);
  }, [basePath]);

  useEffect(() => {
    loadFirstPage().catch((err: unknown) => setError(errorMessage(err)));
  }, [loadFirstPage]);

  async function loadMore() {
    if (!nextCursor) return;
    const page = await api.get<Page<Fueling>>(
      `${basePath}?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
    );
    setItems([...items, ...page.items]);
    setNextCursor(page.nextCursor);
  }

  function startEdit(fueling: Fueling) {
    setEditingId(fueling.id);
    setForm({
      filledAt: toInputDateTime(fueling.filledAt),
      liters: String(fueling.liters),
      pricePerLiter: String(fueling.pricePerLiter),
      totalCost: String(fueling.totalCost),
      odometerKm: String(fueling.odometerKm),
      station: fueling.station ?? '',
      fullTank: fueling.fullTank,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(vehicle));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body = {
      filledAt: fromInputDateTime(form.filledAt),
      liters: Number(form.liters),
      pricePerLiter: Number(form.pricePerLiter),
      // total vazio: a API calcula litros x preço
      ...(form.totalCost ? { totalCost: Number(form.totalCost) } : {}),
      odometerKm: Number(form.odometerKm),
      ...(form.station ? { station: form.station } : {}),
      fullTank: form.fullTank,
    };
    try {
      if (editingId) {
        await api.patch(`${basePath}/${editingId}`, body);
      } else {
        await api.post(basePath, body);
      }
      setEditingId(null);
      setForm(emptyForm(vehicle));
      await loadFirstPage();
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(fueling: Fueling) {
    if (!confirm('Apagar este abastecimento?')) return;
    await api.delete(`${basePath}/${fueling.id}`);
    await loadFirstPage();
  }

  return (
    <>
      <form
        className="card grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-end gap-x-4 gap-y-3"
        onSubmit={handleSubmit}
      >
        <h2 className="col-span-full">
          {editingId ? 'Editar abastecimento' : 'Novo abastecimento'}
        </h2>
        <label>
          Data e hora
          <input
            type="datetime-local"
            value={form.filledAt}
            onChange={(e) => setForm({ ...form, filledAt: e.target.value })}
            required
          />
        </label>
        <label>
          Litros
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })}
            required
          />
        </label>
        <label>
          Preço por litro (R$)
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.pricePerLiter}
            onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })}
            required
          />
        </label>
        <label>
          Total pago (R$, opcional)
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.totalCost}
            onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
            placeholder="calculado se vazio"
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
          Posto / local
          <input
            value={form.station}
            onChange={(e) => setForm({ ...form, station: e.target.value })}
            placeholder="Posto Trevo"
          />
        </label>
        <label className="flex-row items-center font-normal">
          <input
            type="checkbox"
            checked={form.fullTank}
            onChange={(e) => setForm({ ...form, fullTank: e.target.checked })}
          />
          Completei o tanque (usado no cálculo de km/l)
        </label>
        <ErrorMessage message={error} />
        <div className="col-span-full mt-2 flex items-center gap-3">
          <button type="submit">{editingId ? 'Salvar alterações' : 'Registrar'}</button>
          {editingId && (
            <button
              type="button"
              className="border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              onClick={cancelEdit}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-gray-500">Nenhum abastecimento registrado.</p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Posto</th>
                <th className="text-right tabular-nums">Litros</th>
                <th className="text-right tabular-nums">R$/litro</th>
                <th className="text-right tabular-nums">Total</th>
                <th className="text-right tabular-nums">Odômetro</th>
                <th>Tanque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((fueling) => (
                <tr key={fueling.id}>
                  <td>{formatDateTime(fueling.filledAt)}</td>
                  <td>{fueling.station ?? '-'}</td>
                  <td className="text-right tabular-nums">{formatNumber(fueling.liters)}</td>
                  <td className="text-right tabular-nums">{formatMoney(fueling.pricePerLiter)}</td>
                  <td className="text-right tabular-nums">{formatMoney(fueling.totalCost)}</td>
                  <td className="text-right tabular-nums">{formatKm(fueling.odometerKm)}</td>
                  <td>{fueling.fullTank ? 'cheio' : 'parcial'}</td>
                  <td className="space-x-3">
                    <button
                      className="bg-transparent p-0 text-blue-600 hover:bg-transparent hover:underline"
                      onClick={() => startEdit(fueling)}
                    >
                      Editar
                    </button>
                    <button
                      className="bg-transparent p-0 text-red-600 hover:bg-transparent hover:underline"
                      onClick={() => handleDelete(fueling)}
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
      {nextCursor && (
        <button
          className="border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
          onClick={loadMore}
        >
          Carregar mais
        </button>
      )}
    </>
  );
}
