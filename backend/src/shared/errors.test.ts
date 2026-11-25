import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { problems, registerErrorHandling } from './errors.js';

function buildTestServer() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);

  app.get('/conflito', () => {
    throw problems.conflict('Placa já cadastrada.');
  });
  app.get('/quebrado', () => {
    throw new Error('detalhe interno que não pode vazar');
  });
  app.post('/valida', { schema: { body: z.object({ litros: z.number().positive() }) } }, () => ({
    ok: true,
  }));
  return app;
}

describe('problem+json', () => {
  it('lista cada campo inválido', async () => {
    const app = buildTestServer();

    const response = await app.inject({ method: 'POST', url: '/valida', payload: { litros: -3 } });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: '/problems/validation',
      status: 400,
      errors: [{ field: 'body/litros', message: expect.any(String) as string }],
    });
  });
});
