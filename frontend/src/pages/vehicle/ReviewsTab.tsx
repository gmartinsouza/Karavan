import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import { ErrorMessage } from '../../components/ErrorMessage';
import { ReviewStatus } from '../../components/ReviewStatus';
import { formatDate, formatKm, fromInputDateTime, nowForInput } from '../../format';
import type { Review, Vehicle } from '../../types';
import { errorMessage, useApi } from '../../useApi';

function emptyForm(vehicle: Vehicle) {
  return {
    name: '',
    intervalKm: '10000',
    intervalMonths: '12',
    lastDoneAt: nowForInput(),
    lastDoneKm: String(vehicle.odometerKm),
  };
}

// Texto "faltam X km / Y dias" (negativo = atrasada)
function remaining(review: Review) {
  const parts: string[] = [];
  if (review.remainingKm !== null) {
    parts.push(
      review.remainingKm >= 0
        ? `faltam ${formatKm(review.remainingKm)}`
        : `passou ${formatKm(-review.remainingKm)}`,
    );
  }
  if (review.remainingDays !== null) {
    parts.push(
      review.remainingDays >= 0
        ? `faltam ${review.remainingDays} dias`
        : `atrasada há ${-review.remainingDays} dias`,
    );
  }
  return parts.join(' · ');
}

export function ReviewsTab({ vehicle }: { vehicle: Vehicle }) {
  const basePath = `/vehicles/${vehicle.id}/reviews`;
  // a API já devolve as atrasadas primeiro
  const { data: reviews, error, reload } = useApi<Review[]>(basePath);
  const [form, setForm] = useState(() => emptyForm(vehicle));
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await api.post(basePath, {
        name: form.name,
        // campo vazio vira null: revisão só por km ou só por tempo
        intervalKm: form.intervalKm ? Number(form.intervalKm) : null,
        intervalMonths: form.intervalMonths ? Number(form.intervalMonths) : null,
        lastDoneAt: fromInputDateTime(form.lastDoneAt),
        lastDoneKm: Number(form.lastDoneKm),
      });
      setForm(emptyForm(vehicle));
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  // "Fiz hoje": a revisão passa a contar de agora e do odômetro atual
  async function markDone(review: Review) {
    await api.patch(`${basePath}/${review.id}`, {
      lastDoneAt: new Date().toISOString(),
      lastDoneKm: vehicle.odometerKm,
    });
    await reload();
  }

  async function handleDelete(review: Review) {
    if (!confirm(`Apagar a revisão "${review.name}"?`)) return;
    await api.delete(`${basePath}/${review.id}`);
    await reload();
  }

  return (
    <>
      <ErrorMessage message={error} />
      {reviews && reviews.length === 0 && <p className="muted">Nenhuma revisão programada.</p>}
      <div className="cards">
        {reviews?.map((review) => (
          <div className="card" key={review.id}>
            <div className="card-title">
              <h2>{review.name}</h2>
              <ReviewStatus status={review.status} />
            </div>
            <p className="muted">
              A cada {review.intervalKm ? formatKm(review.intervalKm) : ''}
              {review.intervalKm && review.intervalMonths ? ' ou ' : ''}
              {review.intervalMonths ? `${review.intervalMonths} meses` : ''}
            </p>
            <p>
              Última: {formatDate(review.lastDoneAt)} com {formatKm(review.lastDoneKm)}
            </p>
            <p>
              Próxima: {review.dueKm !== null && formatKm(review.dueKm)}
              {review.dueKm !== null && review.dueDate && ' ou '}
              {review.dueDate && formatDate(review.dueDate)}
            </p>
            <p className="muted">{remaining(review)}</p>
            <div className="actions">
              <button onClick={() => markDone(review)}>Fiz hoje</button>
              <button className="link danger" onClick={() => handleDelete(review)}>
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <h2 className="full">Programar revisão</h2>
        <label>
          Nome
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Troca de óleo"
            required
            minLength={2}
          />
        </label>
        <label>
          A cada (km)
          <input
            type="number"
            min="1"
            value={form.intervalKm}
            onChange={(e) => setForm({ ...form, intervalKm: e.target.value })}
          />
        </label>
        <label>
          A cada (meses)
          <input
            type="number"
            min="1"
            value={form.intervalMonths}
            onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })}
          />
        </label>
        <label>
          Última vez feita em
          <input
            type="datetime-local"
            value={form.lastDoneAt}
            onChange={(e) => setForm({ ...form, lastDoneAt: e.target.value })}
            required
          />
        </label>
        <label>
          Com quantos km
          <input
            type="number"
            min="0"
            value={form.lastDoneKm}
            onChange={(e) => setForm({ ...form, lastDoneKm: e.target.value })}
            required
          />
        </label>
        <ErrorMessage message={formError} />
        <div className="actions full">
          <button type="submit">Programar</button>
        </div>
      </form>
    </>
  );
}
