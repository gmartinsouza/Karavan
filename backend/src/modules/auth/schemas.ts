import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('e-mail inválido'))
  .meta({ example: 'demo@caravana.dev' });

export const registerBody = z.object({
  name: z.string().trim().min(2, 'mínimo de 2 caracteres').max(100),
  email,
  password: z
    .string()
    .min(8, 'mínimo de 8 caracteres')
    .max(128, 'máximo de 128 caracteres')
    .meta({ example: 'caravana123' }),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(128).meta({ example: 'caravana123' }),
});

export const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

export const userResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.iso.datetime(),
});

export const sessionResponse = z.object({
  tokenType: z.literal('Bearer'),
  accessToken: z.string(),
  expiresIn: z.number().int().describe('validade do access token em segundos'),
  refreshToken: z.string(),
});
