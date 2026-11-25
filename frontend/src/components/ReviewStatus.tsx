import type { Review } from '../types';

// Status da revisão com ícone e texto (a cor sozinha não basta para quem não enxerga cores).
const labels: Record<Review['status'], string> = {
  ok: '✓ Em dia',
  due_soon: '! Próxima',
  overdue: '✕ Atrasada',
};

export function ReviewStatus({ status }: { status: Review['status'] }) {
  return <span className={`badge badge-${status}`}>{labels[status]}</span>;
}
