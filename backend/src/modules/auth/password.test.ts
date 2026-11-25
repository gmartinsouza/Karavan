import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    const hash = await hashPassword('caravana123');

    await expect(verifyPassword('caravana123', hash)).resolves.toBe(true);
    await expect(verifyPassword('caravana124', hash)).resolves.toBe(false);
  });
});
