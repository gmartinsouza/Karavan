import { describe, expect, it } from 'vitest';
import { findOdometerConflict, isTotalCostConsistent } from './fueling.js';
import { normalizePlate } from './plate.js';
import { evaluateReview } from './review.js';
import { canChangeOdometer } from './vehicle.js';

describe('placa', () => {
  it.each([
    ['ABC1D23', 'ABC1D23'],
    ['abc-1234', 'ABC1234'],
    [' rtb 4e21 ', 'RTB4E21'],
  ])('normaliza %s para %s', (input, expected) => {
    expect(normalizePlate(input)).toBe(expected);
  });
});

describe('veículo', () => {
  it('não deixa o odômetro voltar', () => {
    expect(canChangeOdometer(50_000, 50_000)).toBe(true);
    expect(canChangeOdometer(50_000, 50_100)).toBe(true);
    expect(canChangeOdometer(50_000, 49_999)).toBe(false);
  });
});

describe('abastecimento', () => {
  it('tolera diferença de até R$ 0,10 do total informado pela bomba', () => {
    expect(isTotalCostConsistent(40.5, 6.19, 250.75)).toBe(true);
    expect(isTotalCostConsistent(40.5, 6.19, 251)).toBe(false);
  });

  it('exige odômetro entre o abastecimento anterior e o seguinte', () => {
    expect(findOdometerConflict(1500, { odometerKm: 1000 }, { odometerKm: 2000 })).toBeNull();
    expect(findOdometerConflict(1500, null, null)).toBeNull();
    expect(findOdometerConflict(1000, { odometerKm: 1000 }, null)).toMatch(/maior que 1000 km/);
    expect(findOdometerConflict(2000, null, { odometerKm: 2000 })).toMatch(/menor que 2000 km/);
  });
});

describe('revisão', () => {
  const lastDoneAt = new Date('2026-01-15T10:00:00Z');

  it('está em dia longe do vencimento', () => {
    const result = evaluateReview(
      { intervalKm: 10_000, intervalMonths: 12, lastDoneKm: 40_000, lastDoneAt },
      43_000,
      new Date('2026-05-01T00:00:00Z'),
    );

    expect(result).toMatchObject({ status: 'ok', dueKm: 50_000, remainingKm: 7_000 });
  });

  it('atrasa pelo que vencer primeiro: km ou data', () => {
    const byKm = evaluateReview(
      { intervalKm: 10_000, intervalMonths: 12, lastDoneKm: 40_000, lastDoneAt },
      50_194,
      new Date('2026-05-01T00:00:00Z'),
    );
    const byDate = evaluateReview(
      { intervalKm: 10_000, intervalMonths: 12, lastDoneKm: 40_000, lastDoneAt },
      42_000,
      new Date('2027-02-01T00:00:00Z'),
    );

    expect(byKm).toMatchObject({ status: 'overdue', remainingKm: -194 });
    expect(byDate).toMatchObject({ status: 'overdue', remainingDays: -17 });
  });
});
