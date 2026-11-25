import { inject } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import type { Database } from '../../src/shared/database.js';

export const testJwtSecret = 'segredo-de-teste-com-pelo-menos-32-caracteres';

export function testConfig(overrides: Record<string, string> = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: inject('databaseUrl'),
    JWT_SECRET: testJwtSecret,
    ...overrides,
  });
}

export function buildTestApp(database: Database) {
  return buildApp({ config: testConfig(), database });
}
