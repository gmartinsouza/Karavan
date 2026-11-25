import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTokenService } from './tokens.js';

const secret = 'segredo-de-teste-com-pelo-menos-32-caracteres';
const userId = '01a20fc4-81b4-7b74-8745-fa0fc28e9c2b';

describe('access token', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('recusa token expirado', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const tokens = createTokenService({ secret, accessTokenTtlSeconds: 900 });
    const { token } = await tokens.issueAccessToken(userId);

    vi.setSystemTime(new Date('2026-01-01T12:15:01Z'));

    await expect(tokens.verifyAccessToken(token)).resolves.toBeNull();
  });
});
