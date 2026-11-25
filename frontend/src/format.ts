// Funções pequenas para mostrar números e datas no padrão brasileiro.
import type { FuelType } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function formatMoney(value: number) {
  return money.format(value);
}

export function formatNumber(value: number) {
  return number.format(value);
}

export function formatKm(value: number) {
  return `${number.format(value)} km`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// "2026-03" -> "mar/26"
export function formatMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  return date
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('. de ', '/');
}

// O <input type="datetime-local"> trabalha com "2026-03-10T18:30" (sem fuso).
// Estas duas funções convertem entre esse formato e o ISO que a API usa.
export function toInputDateTime(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromInputDateTime(value: string) {
  return new Date(value).toISOString();
}

export function nowForInput() {
  return toInputDateTime(new Date().toISOString());
}

export const fuelTypeLabels: Record<FuelType, string> = {
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  FLEX: 'Flex',
  DIESEL: 'Diesel',
  CNG: 'GNV',
  ELECTRIC: 'Elétrico',
};
