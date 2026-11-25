import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../src/app.js';
import { buildTestApp } from './support/app.js';
import { connectTestDatabase, resetDatabase } from './support/database.js';
import { argo, createSession, createVehicle, type TestSession } from './support/session.js';

const database = connectTestDatabase();
let app: App;
let ana: TestSession;
let bruno: TestSession;

beforeAll(async () => {
  app = await buildTestApp(database);
});

beforeEach(async () => {
  await resetDatabase(database);
  ana = await createSession(app, 'ana@example.com');
  bruno = await createSession(app, 'bruno@example.com');
});

afterAll(async () => {
  await app.close();
  await database.$disconnect();
});

interface VehiclePage {
  items: { id: string; plate: string }[];
  nextCursor: string | null;
}

describe('isolamento entre usuários', () => {
  it('um usuário não vê, altera nem apaga o veículo de outro', async () => {
    const vehicle = await createVehicle(app, ana);
    const url = `/api/v1/vehicles/${vehicle.id}`;

    const get = await app.inject({ method: 'GET', url, headers: bruno.headers });
    const patch = await app.inject({
      method: 'PATCH',
      url,
      headers: bruno.headers,
      payload: { model: 'invadido' },
    });
    const remove = await app.inject({ method: 'DELETE', url, headers: bruno.headers });
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/vehicles',
      headers: bruno.headers,
    });

    expect([get.statusCode, patch.statusCode, remove.statusCode]).toEqual([404, 404, 404]);
    expect(list.json<VehiclePage>().items).toEqual([]);
    const stillThere = await app.inject({ method: 'GET', url, headers: ana.headers });
    expect(stillThere.json()).toMatchObject({ model: argo.model });
  });
});

describe('alteração', () => {
  it('não deixa o odômetro voltar', async () => {
    const vehicle = await createVehicle(app, ana);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/vehicles/${vehicle.id}`,
      headers: ana.headers,
      payload: { odometerKm: 37_000 },
    });

    expect(response.statusCode).toBe(422);
  });
});

describe('paginação por cursor', () => {
  it('percorre todas as páginas sem repetir nem pular', async () => {
    for (let index = 0; index < 25; index += 1) {
      await createVehicle(app, ana, { plate: `AAA${String(1000 + index)}` });
    }

    const seen: string[] = [];
    const pageSizes: number[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?limit=10&cursor=${cursor}` : '?limit=10';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/vehicles${query}`,
        headers: ana.headers,
      });
      const page = response.json<VehiclePage>();
      pageSizes.push(page.items.length);
      seen.push(...page.items.map((item) => item.plate));
      cursor = page.nextCursor;
    } while (cursor);

    expect(pageSizes).toEqual([10, 10, 5]);
    expect(new Set(seen).size).toBe(25);
    expect(seen[0]).toBe('AAA1024');
  });
});
