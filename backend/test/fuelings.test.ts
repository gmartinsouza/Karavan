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
  vehicleId = (await createVehicle(app, ana, { odometerKm: 38_000 })).id;
});

afterAll(async () => {
  await app.close();
  await database.$disconnect();
});

function fueling(overrides: Record<string, unknown> = {}) {
  return {
    filledAt: '2026-03-10T18:30:00-03:00',
    liters: 40.5,
    pricePerLiter: 6.19,
    odometerKm: 38_500,
    station: 'Posto Trevo',
    fullTank: true,
    ...overrides,
  };
}

function postFueling(payload: Record<string, unknown>, session = ana, id = vehicleId) {
  return app.inject({
    method: 'POST',
    url: `/api/v1/vehicles/${id}/fuelings`,
    headers: session.headers,
    payload,
  });
}

async function vehicleOdometer() {
  const response = await app.inject({
    method: 'GET',
    url: `/api/v1/vehicles/${vehicleId}`,
    headers: ana.headers,
  });
  return response.json<{ odometerKm: number }>().odometerKm;
}

describe('registro de abastecimento', () => {
  it('calcula o total, devolve números e atualiza o odômetro do veículo', async () => {
    const response = await postFueling(fueling());

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      liters: 40.5,
      pricePerLiter: 6.19,
      totalCost: 250.7,
      filledAt: '2026-03-10T21:30:00.000Z',
      fullTank: true,
    });
    expect(await vehicleOdometer()).toBe(38_500);
  });

  it('recusa odômetro menor que o do abastecimento anterior', async () => {
    await postFueling(fueling({ filledAt: '2026-03-10T10:00:00Z', odometerKm: 38_500 }));

    const response = await postFueling(
      fueling({ filledAt: '2026-03-20T10:00:00Z', odometerKm: 38_400 }),
    );

    expect(response.statusCode).toBe(422);
    expect(response.json<{ detail: string }>().detail).toMatch(/maior que 38500 km/);
  });

  it('serializa abastecimentos simultâneos no mesmo veículo', async () => {
    const payloads = Array.from({ length: 10 }, (_, index) =>
      fueling({
        filledAt: `2026-04-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
        odometerKm: 39_000 + index * 300,
      }),
    );

    const responses = await Promise.all(payloads.map((payload) => postFueling(payload)));

    expect(responses.map((response) => response.statusCode)).toEqual(Array(10).fill(201));
    expect(await vehicleOdometer()).toBe(39_000 + 9 * 300);
  });
});

describe('edição de abastecimento', () => {
  function patchFueling(fuelingId: string, payload: Record<string, unknown>, session = ana) {
    return app.inject({
      method: 'PATCH',
      url: `/api/v1/vehicles/${vehicleId}/fuelings/${fuelingId}`,
      headers: session.headers,
      payload,
    });
  }

  it('recalcula o total quando os litros mudam', async () => {
    const created = (await postFueling(fueling())).json<{ id: string }>();

    const response = await patchFueling(created.id, { liters: 30 });

    expect(response.json()).toMatchObject({ liters: 30, totalCost: 185.7 });
  });
});
