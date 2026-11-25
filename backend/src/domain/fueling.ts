import { roundTo } from './numbers.js';

export const TOTAL_COST_TOLERANCE = 0.1;

export interface OdometerReading {
  odometerKm: number;
}

export function computeTotalCost(liters: number, pricePerLiter: number): number {
  return roundTo(liters * pricePerLiter, 2);
}

export function isTotalCostConsistent(
  liters: number,
  pricePerLiter: number,
  totalCost: number,
): boolean {
  return Math.abs(computeTotalCost(liters, pricePerLiter) - totalCost) <= TOTAL_COST_TOLERANCE;
}

export function findOdometerConflict(
  odometerKm: number,
  previous: OdometerReading | null,
  next: OdometerReading | null,
): string | null {
  if (previous && odometerKm <= previous.odometerKm) {
    return `O odômetro precisa ser maior que ${previous.odometerKm} km, registrado no abastecimento anterior.`;
  }
  if (next && odometerKm >= next.odometerKm) {
    return `O odômetro precisa ser menor que ${next.odometerKm} km, registrado no abastecimento seguinte.`;
  }
  return null;
}
