import { roundTo } from './numbers.js';

// Consumo pelo método do "tanque cheio":
// entre dois abastecimentos com tanque cheio, os litros colocados depois do primeiro
// são exatamente o que o carro gastou para rodar a distância entre os dois.
// Abastecimentos parciais no meio somam litros e custo no trecho.

export interface FuelingForConsumption {
  id: string;
  filledAt: Date;
  odometerKm: number;
  liters: number;
  totalCost: number;
  fullTank: boolean;
}

export interface ConsumptionSegment {
  fuelingId: string; // o tanque cheio que fecha o trecho
  filledAt: Date;
  distanceKm: number;
  liters: number;
  cost: number;
  kmPerLiter: number;
  costPerKm: number;
}

export interface ConsumptionSummary {
  distanceKm: number;
  liters: number;
  cost: number;
  averageKmPerLiter: number | null;
  costPerKm: number | null;
}

// Recebe os abastecimentos em ordem de data (do mais antigo ao mais novo).
export function computeConsumption(fuelings: FuelingForConsumption[]): ConsumptionSegment[] {
  const segments: ConsumptionSegment[] = [];
  let lastFull: FuelingForConsumption | null = null;
  let liters = 0;
  let cost = 0;

  for (const fueling of fuelings) {
    if (lastFull) {
      liters += fueling.liters;
      cost += fueling.totalCost;
    }
    if (!fueling.fullTank) {
      continue;
    }
    if (lastFull) {
      const distanceKm = fueling.odometerKm - lastFull.odometerKm;
      segments.push({
        fuelingId: fueling.id,
        filledAt: fueling.filledAt,
        distanceKm,
        liters: roundTo(liters, 3),
        cost: roundTo(cost, 2),
        kmPerLiter: roundTo(distanceKm / liters, 2),
        costPerKm: roundTo(cost / distanceKm, 3),
      });
    }
    // este tanque cheio vira o começo do próximo trecho
    lastFull = fueling;
    liters = 0;
    cost = 0;
  }
  return segments;
}

// Média do período: soma tudo e divide uma vez só.
// (Média de médias daria peso igual a um trecho de 50 km e a um de 600 km.)
export function summarizeConsumption(segments: ConsumptionSegment[]): ConsumptionSummary {
  const distanceKm = segments.reduce((sum, segment) => sum + segment.distanceKm, 0);
  const liters = segments.reduce((sum, segment) => sum + segment.liters, 0);
  const cost = segments.reduce((sum, segment) => sum + segment.cost, 0);
  return {
    distanceKm,
    liters: roundTo(liters, 3),
    cost: roundTo(cost, 2),
    averageKmPerLiter: liters > 0 ? roundTo(distanceKm / liters, 2) : null,
    costPerKm: distanceKm > 0 ? roundTo(cost / distanceKm, 3) : null,
  };
}
