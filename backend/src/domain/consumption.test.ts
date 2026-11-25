import { describe, expect, it } from 'vitest';
import {
  computeConsumption,
  summarizeConsumption,
  type FuelingForConsumption,
} from './consumption.js';

let sequence = 0;
function fueling(
  odometerKm: number,
  liters: number,
  totalCost: number,
  fullTank = true,
): FuelingForConsumption {
  sequence += 1;
  return {
    id: `f${sequence}`,
    filledAt: new Date(2026, 0, sequence),
    odometerKm,
    liters,
    totalCost,
    fullTank,
  };
}

describe('consumo pelo método do tanque cheio', () => {
  it('soma os abastecimentos parciais no trecho', () => {
    const segments = computeConsumption([
      fueling(1000, 40, 240),
      fueling(1200, 10, 60, false),
      fueling(1600, 30, 180),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ distanceKm: 600, liters: 40, kmPerLiter: 15 });
  });

  it('a média do período pesa cada trecho pela distância', () => {
    const summary = summarizeConsumption(
      computeConsumption([fueling(0, 40, 200), fueling(100, 10, 50), fueling(700, 40, 200)]),
    );

    // 700 km com 50 litros, não a média simples de 10 e 15 km/l
    expect(summary).toEqual({
      distanceKm: 700,
      liters: 50,
      cost: 250,
      averageKmPerLiter: 14,
      costPerKm: 0.357,
    });
  });
});
