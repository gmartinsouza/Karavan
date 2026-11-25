import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../src/app.js';
import { buildTestApp } from './support/app.js';
import { connectTestDatabase, resetDatabase } from './support/database.js';

const database = connectTestDatabase();
let app: App;

const account = { name: 'Ana Motorista', email: 'ana@example.com', password: 'senha-forte-1' };

interface SessionBody {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

async function register(body: Record<string, unknown> = account) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: body });
}

async function login(email = account.email, password = account.password) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
}

async function refresh(refreshToken: string) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } });
}

async function me(accessToken?: string) {
  return app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
}

beforeAll(async () => {
  app = await buildTestApp(database);
});

beforeEach(async () => {
  await resetDatabase(database);
});

afterAll(async () => {
  await app.close();
  await database.$disconnect();
});

describe('login', () => {
  beforeEach(async () => {
    await register();
  });

  it('devolve access token e refresh token', async () => {
    const response = await login();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      accessToken: expect.stringMatching(/^ey/) as string,
      refreshToken: expect.any(String) as string,
    });
  });

  it('responde a mesma mensagem para senha errada e e-mail inexistente', async () => {
    const wrongPassword = await login(account.email, 'senha-errada');
    const unknownEmail = await login('ninguem@example.com', account.password);

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json<{ detail: string }>().detail).toBe(
      unknownEmail.json<{ detail: string }>().detail,
    );
  });
});

describe('rota protegida /me', () => {
  it('recusa requisição sem token', async () => {
    const response = await me();

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });
});

describe('refresh com rotação', () => {
  beforeEach(async () => {
    await register();
  });

  it('encerra a família inteira quando um refresh token antigo é reutilizado', async () => {
    const first = (await login()).json<SessionBody>();
    const second = (await refresh(first.refreshToken)).json<SessionBody>();

    const reuse = await refresh(first.refreshToken);
    const afterReuse = await refresh(second.refreshToken);

    expect(reuse.statusCode).toBe(401);
    expect(reuse.json<{ detail: string }>().detail).toMatch(/já utilizado/);
    expect(afterReuse.statusCode).toBe(401);
    expect(afterReuse.json<{ detail: string }>().detail).toMatch(/Sessão encerrada/);
    await expect(database.refreshToken.count({ where: { revokedAt: null } })).resolves.toBe(0);
  });

  it('aceita só um de dois refresh simultâneos com o mesmo token', async () => {
    const { refreshToken } = (await login()).json<SessionBody>();

    const results = await Promise.all([refresh(refreshToken), refresh(refreshToken)]);

    const statuses = results.map((result) => result.statusCode).sort();
    expect(statuses).toEqual([200, 401]);
  });
});

describe('refresh token em cookie (navegador)', () => {
  function cookieFrom(response: Awaited<ReturnType<typeof login>>) {
    return response.cookies.find((cookie) => cookie.name === 'refreshToken');
  }

  it('renova a sessão usando só o cookie, sem nada no corpo', async () => {
    await register();
    const cookie = cookieFrom(await login());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
      cookies: { refreshToken: cookie?.value ?? '' },
    });

    expect(response.statusCode).toBe(200);
    expect(cookieFrom(response)?.value).not.toBe(cookie?.value);
  });

  it('o logout encerra a sessão do cookie e apaga o cookie', async () => {
    await register();
    const cookie = cookieFrom(await login());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {},
      cookies: { refreshToken: cookie?.value ?? '' },
    });

    expect(response.statusCode).toBe(204);
    expect(cookieFrom(response)?.value).toBe('');
    expect((await refresh(cookie?.value ?? '')).statusCode).toBe(401);
  });
});
