import { formatMoney, formatMonth } from '../format';

interface MonthValue {
  month: string; // "2026-03"
  value: number;
}

// Gráfico de barras feito só com HTML e CSS: a altura de cada barra é a
// porcentagem do valor em relação ao maior mês. Passe o mouse para ver o valor.
export function MonthlyChart({ title, data }: { title: string; data: MonthValue[] }) {
  if (data.length === 0) {
    return <p className="muted">Sem dados para o gráfico.</p>;
  }
  const max = Math.max(...data.map((item) => item.value));

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div className="chart-bars">
        {data.map((item) => (
          <div
            className="chart-column"
            key={item.month}
            title={`${formatMonth(item.month)}: ${formatMoney(item.value)}`}
          >
            <div className="chart-bar-area">
              <div
                className="chart-bar"
                style={{ height: max > 0 ? `${(item.value / max) * 100}%` : 0 }}
              />
            </div>
            <span className="chart-label">{formatMonth(item.month)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
