import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../src/app.js';
import { buildTestApp } from './support/app.js';
import { connectTestDatabase, resetDatabase } from './support/database.js';
import { createSession, createVehicle, type TestSession } from './support/session.js';

const database = connectTestDatabase();
let app: App;
let ana: TestSession;
let vehicleId: string;

beforeAll(async () => {
  app = await buildTestApp(database);
});

beforeEach(async () => {
  await resetDatabase(database);
  ana = await createSession(app, 'ana@example.com');
  vehicleId = (await createVehicle(app, ana, { odometerKm: 10_000 })).id;
});

afterAll(async () => {
  await app.close();
  await database.$disconnect();
});

function post(path: string, payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: `/api/v1/vehicles/${vehicleId}/${path}`,
    headers: ana.headers,
    payload,
  });
}

function getStats(query = '', session = ana) {
  return app.inject({
    method: 'GET',
    url: `/api/v1/vehicles/${vehicleId}/stats${query}`,
    headers: session.headers,
  });
}

describe('estatísticas do veículo', () => {
  beforeEach(async () => {
    const base = { pricePerLiter: 6, fullTank: true };
    await post('fuelings', {
      ...base,
      filledAt: '2026-01-05T10:00:00-03:00',
      liters: 40,
      odometerKm: 10_100,
    });
    await post('fuelings', {
      ...base,
      filledAt: '2026-01-20T10:00:00-03:00',
      liters: 10,
      odometerKm: 10_250,
      fullTank: false,
    });
    await post('fuelings', {
      ...base,
      filledAt: '2026-02-03T10:00:00-03:00',
      liters: 30,
      odometerKm: 10_700,
    });
    // 22h do dia 28 em São Paulo já é dia 1º em UTC: tem que contar em fevereiro
    await post('maintenances', {
      kind: 'SERVICE',
      item: 'Troca de óleo',
      performedAt: '2026-02-28T22:00:00-03:00',
      odometerKm: 10_800,
      cost: 300,
    });
  });

  it('calcula km/l, custo por km e totais', async () => {
    const response = await getStats();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      fuelingCount: 3,
      totalLiters: 80,
      totalFuelCost: 480,
      totalMaintenanceCost: 300,
      distanceKm: 600,
      averageKmPerLiter: 15,
      costPerKm: 0.4,
    });
  });

  it('agrupa os gastos por mês no fuso de São Paulo', async () => {
    const { monthly } = (await getStats()).json<{ monthly: unknown[] }>();

    expect(monthly).toEqual([
      { month: '2026-01', fuelCost: 300, maintenanceCost: 0, liters: 50 },
      { month: '2026-02', fuelCost: 180, maintenanceCost: 300, liters: 30 },
    ]);
  });
});
