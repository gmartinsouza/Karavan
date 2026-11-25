import { describe, expect, it } from 'vitest';
import { InvalidConfigError, loadConfig } from './config.js';

const required = {
  DATABASE_URL: 'postgresql://caravana:caravana@localhost:5432/caravana',
  JWT_SECRET: 'segredo-de-teste-com-pelo-menos-32-caracteres',
};

describe('loadConfig', () => {
  it('aplica valores padrão quando as variáveis opcionais não existem', () => {
    const config = loadConfig(required);

    expect(config).toEqual({
      env: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      shutdownTimeoutMs: 10_000,
      databaseUrl: required.DATABASE_URL,
      corsOrigin: 'http://localhost:5173',
      auth: {
        jwtSecret: required.JWT_SECRET,
        accessTokenTtlSeconds: 900,
        refreshTokenTtlDays: 30,
      },
    });
  });

  it('rejeita valores inválidos listando cada problema', () => {
    const invalid = { ...required, PORT: 'abc', NODE_ENV: 'staging' };

    expect(() => loadConfig(invalid)).toThrow(InvalidConfigError);
    expect(() => loadConfig(invalid)).toThrow(/PORT[\s\S]*NODE_ENV|NODE_ENV[\s\S]*PORT/);
  });
});
