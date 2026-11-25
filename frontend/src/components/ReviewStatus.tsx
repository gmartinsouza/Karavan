import type { Review } from '../types';

// Status da revisão com ícone e texto (a cor sozinha não basta para quem não enxerga cores).
const labels: Record<Review['status'], string> = {
  ok: '✓ Em dia',
  due_soon: '! Próxima',
  overdue: '✕ Atrasada',
};

const colors: Record<Review['status'], string> = {
  ok: 'bg-green-100 text-green-700',
  due_soon: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-600',
};

export function ReviewStatus({ status }: { status: Review['status'] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}
