import type { App } from '../../src/app.js';

export interface TestSession {
  headers: { authorization: string };
}

export async function createSession(app: App, email: string): Promise<TestSession> {
  const password = 'senha-de-teste-1';
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { name: 'Motorista de Teste', email, password },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
  const { accessToken } = login.json<{ accessToken: string }>();
  return { headers: { authorization: `Bearer ${accessToken}` } };
}

export const argo = {
  brand: 'Fiat',
  model: 'Argo Drive 1.3',
  year: 2021,
  plate: 'RTB-4E21',
  fuelType: 'FLEX',
  odometerKm: 38_000,
} as const;

export async function createVehicle(
  app: App,
  session: TestSession,
  overrides: Record<string, unknown> = {},
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/vehicles',
    headers: session.headers,
    payload: { ...argo, ...overrides },
  });
  return response.json<{ id: string; plate: string; odometerKm: number }>();
}
