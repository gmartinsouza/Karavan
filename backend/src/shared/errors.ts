import { STATUS_CODES } from 'node:http';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

export type Problem = z.infer<typeof problemSchema>;

export class HttpProblem extends Error {
  constructor(
    readonly status: number,
    readonly slug: string,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(detail ?? title);
    this.name = 'HttpProblem';
  }
}

export const problems = {
  badRequest: (slug: string, detail: string) =>
    new HttpProblem(400, slug, 'Requisição inválida', detail),
  unauthorized: (detail = 'Credenciais ausentes ou inválidas.') =>
    new HttpProblem(401, 'unauthorized', 'Não autenticado', detail),
  notFound: (detail: string) => new HttpProblem(404, 'not-found', 'Não encontrado', detail),
  conflict: (detail: string) => new HttpProblem(409, 'conflict', 'Conflito', detail),
  unprocessable: (detail: string) =>
    new HttpProblem(422, 'business-rule', 'Regra de negócio violada', detail),
};

function sendProblem(reply: FastifyReply, request: FastifyRequest, problem: Problem) {
  return reply
    .code(problem.status)
    .type('application/problem+json')
    .send({ ...problem, instance: request.url, requestId: request.id });
}

function problemType(slug: string) {
  return `/problems/${slug}`;
}

export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof HttpProblem) {
      return sendProblem(reply, request, {
        type: problemType(error.slug),
        title: error.title,
        status: error.status,
        ...(error.detail === undefined ? {} : { detail: error.detail }),
      });
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return sendProblem(reply, request, {
        type: problemType('validation'),
        title: 'Dados inválidos',
        status: 400,
        detail: 'Um ou mais campos não passaram na validação.',
        errors: error.validation.map((issue) => ({
          field: `${error.validationContext ?? ''}${issue.instancePath}`,
          message: issue.message ?? 'inválido',
        })),
      });
    }

    const status = error.statusCode ?? 500;
    if (status < 500) {
      return sendProblem(reply, request, {
        type: problemType('http'),
        title: STATUS_CODES[status] ?? 'Erro',
        status,
        detail: error.message,
      });
    }

    request.log.error({ err: error }, 'erro não tratado');
    return sendProblem(reply, request, {
      type: problemType('internal'),
      title: 'Erro interno',
      status: 500,
      detail: 'Algo deu errado. Use o requestId para rastrear o problema nos logs.',
    });
  });

  app.setNotFoundHandler((request, reply) =>
    sendProblem(reply, request, {
      type: problemType('not-found'),
      title: 'Não encontrado',
      status: 404,
      detail: `A rota ${request.method} ${request.url.split('?')[0] ?? ''} não existe.`,
    }),
  );
}
