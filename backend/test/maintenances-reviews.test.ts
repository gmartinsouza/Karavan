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
  vehicleId = (await createVehicle(app, ana, { odometerKm: 53_778 })).id;
});

afterAll(async () => {
  await app.close();
  await database.$disconnect();
});

const oilChange = {
  kind: 'SERVICE',
  item: 'Troca de óleo e filtro de óleo',
  performedAt: '2026-03-10T09:00:00-03:00',
  odometerKm: 43_584,
  cost: 349.9,
  workshop: 'Mecânica Lima',
  notes: 'Óleo 5W30 sintético',
};

describe('manutenções', () => {
  it('sobe o odômetro do veículo quando a manutenção é mais recente', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/vehicles/${vehicleId}/maintenances`,
      headers: ana.headers,
      payload: { ...oilChange, odometerKm: 54_000 },
    });

    const vehicle = await app.inject({
      method: 'GET',
      url: `/api/v1/vehicles/${vehicleId}`,
      headers: ana.headers,
    });

    expect(vehicle.json()).toMatchObject({ odometerKm: 54_000 });
  });
});

describe('revisões', () => {
  const reviewsUrl = () => `/api/v1/vehicles/${vehicleId}/reviews`;

  async function createReview(payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url: reviewsUrl(), headers: ana.headers, payload });
  }

  it('calcula o status pelo odômetro atual do veículo', async () => {
    const response = await createReview({
      name: 'Troca de óleo',
      intervalKm: 10_000,
      intervalMonths: 12,
      lastDoneAt: new Date().toISOString(),
      lastDoneKm: 43_584,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: 'overdue',
      dueKm: 53_584,
      remainingKm: -194,
    });
  });

  it('marca como feita com PATCH e lista atrasadas primeiro', async () => {
    const today = new Date().toISOString();
    const oil = (
      await createReview({
        name: 'Troca de óleo',
        intervalKm: 10_000,
        intervalMonths: null,
        lastDoneAt: today,
        lastDoneKm: 43_584,
      })
    ).json<{ id: string }>();
    await createReview({
      name: 'Alinhamento',
      intervalKm: 10_000,
      intervalMonths: null,
      lastDoneAt: today,
      lastDoneKm: 50_000,
    });

    const before = await app.inject({ method: 'GET', url: reviewsUrl(), headers: ana.headers });
    const done = await app.inject({
      method: 'PATCH',
      url: `${reviewsUrl()}/${oil.id}`,
      headers: ana.headers,
      payload: { lastDoneAt: today, lastDoneKm: 53_778 },
    });

    expect(
      before.json<{ name: string; status: string }[]>().map((r) => [r.name, r.status]),
    ).toEqual([
      ['Troca de óleo', 'overdue'],
      ['Alinhamento', 'ok'],
    ]);
    expect(done.json()).toMatchObject({ status: 'ok', intervalKm: 10_000, remainingKm: 10_000 });
  });
});
