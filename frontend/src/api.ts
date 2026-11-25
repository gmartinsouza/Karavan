// Toda conversa com a API passa por aqui.
//
// Como a sessão funciona:
// - O access token (vale 15 min) fica só numa variável, em memória.
//   Não vai para o localStorage, então um script malicioso na página não o encontra lá.
// - O refresh token fica num cookie httpOnly que a API grava no login.
//   O JavaScript não consegue ler esse cookie; o navegador o envia sozinho para /api/v1/auth.
// - Quando a API responde 401 (token vencido), pedimos um token novo em /auth/refresh
//   e repetimos a requisição uma vez.

import type { Session } from './types';

const BASE_URL = '/api/v1';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Erro com a mensagem que a API mandou (formato problem+json)
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Problem {
  title?: string;
  detail?: string;
  errors?: { field: string; message: string }[];
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: Problem = {};
  try {
    problem = (await response.json()) as Problem;
  } catch {
    // resposta sem corpo JSON: fica só o status
  }
  let message = problem.detail ?? problem.title ?? `Erro ${response.status}`;
  if (problem.errors?.length) {
    const fields = problem.errors.map((error) => `${error.field}: ${error.message}`);
    message += ' ' + fields.join('; ');
  }
  return new ApiError(response.status, message);
}

// Guarda a renovação que está em andamento, se houver.
// Se várias requisições recebem 401 ao mesmo tempo (o painel faz várias de uma vez),
// todas esperam a MESMA renovação. Sem isso, o mesmo refresh token seria usado duas vezes,
// e a API entende isso como roubo de token e encerra a sessão.
let refreshing: Promise<boolean> | null = null;

// Tenta renovar a sessão com o cookie. Devolve true se deu certo.
export function refreshSession(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'include',
  });
  if (!response.ok) {
    setAccessToken(null);
    return false;
  }
  const session = (await response.json()) as Session;
  setAccessToken(session.accessToken);
  return true;
}

function send(path: string, method: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  });
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response = await send(path, method, body);

  // access token vencido: renova e tenta de novo (as rotas /auth não entram nisso)
  if (response.status === 401 && !path.startsWith('/auth') && (await refreshSession())) {
    response = await send(path, method, body);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// Atalhos para deixar as telas mais legíveis
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
  delete: (path: string) => request<void>(path, 'DELETE'),
};
