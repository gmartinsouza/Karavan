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
      <form className="card form-grid" onSubmit={handleSubmit}>
        <h2 className="full">{editingId ? 'Editar abastecimento' : 'Novo abastecimento'}</h2>
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
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.fullTank}
            onChange={(e) => setForm({ ...form, fullTank: e.target.checked })}
          />
          Completei o tanque (usado no cálculo de km/l)
        </label>
        <ErrorMessage message={error} />
        <div className="actions full">
          <button type="submit">{editingId ? 'Salvar alterações' : 'Registrar'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <p className="muted">Nenhum abastecimento registrado.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Posto</th>
                <th className="num">Litros</th>
                <th className="num">R$/litro</th>
                <th className="num">Total</th>
                <th className="num">Odômetro</th>
                <th>Tanque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((fueling) => (
                <tr key={fueling.id}>
                  <td>{formatDateTime(fueling.filledAt)}</td>
                  <td>{fueling.station ?? '-'}</td>
                  <td className="num">{formatNumber(fueling.liters)}</td>
                  <td className="num">{formatMoney(fueling.pricePerLiter)}</td>
                  <td className="num">{formatMoney(fueling.totalCost)}</td>
                  <td className="num">{formatKm(fueling.odometerKm)}</td>
                  <td>{fueling.fullTank ? 'cheio' : 'parcial'}</td>
                  <td className="actions">
                    <button className="link" onClick={() => startEdit(fueling)}>
                      Editar
                    </button>
                    <button className="link danger" onClick={() => handleDelete(fueling)}>
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
        <button className="secondary" onClick={loadMore}>
          Carregar mais
        </button>
      )}
    </>
  );
}
