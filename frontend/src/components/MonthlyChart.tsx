import { formatMoney, formatMonth } from '../format';

interface MonthValue {
  month: string; // "2026-03"
  value: number;
}

// Gráfico de barras feito só com HTML e CSS: a altura de cada barra é a
// porcentagem do valor em relação ao maior mês. Passe o mouse para ver o valor.
export function MonthlyChart({ title, data }: { title: string; data: MonthValue[] }) {
  if (data.length === 0) {
    return <p className="text-gray-500">Sem dados para o gráfico.</p>;
  }
  const max = Math.max(...data.map((item) => item.value));

  return (
    <figure className="mt-2">
      <figcaption className="mb-2 text-sm text-gray-500">{title}</figcaption>
      <div className="flex h-36 gap-0.5 border-b border-gray-200">
        {data.map((item) => (
          <div
            className="group flex min-w-0 flex-1 flex-col"
            key={item.month}
            title={`${formatMonth(item.month)}: ${formatMoney(item.value)}`}
          >
            <div className="flex flex-1 items-end justify-center">
              <div
                className="w-[70%] max-w-9 rounded-t bg-blue-600 group-hover:bg-blue-700"
                style={{ height: max > 0 ? `${(item.value / max) * 100}%` : 0 }}
              />
            </div>
            <span className="mt-1 truncate text-center text-[0.7rem] text-gray-500">
              {formatMonth(item.month)}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}
