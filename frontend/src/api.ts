// Toda conversa com a API passa por aqui.
//
// O access token fica só numa variável, em memória (nunca no localStorage).

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
  const response = await send(path, method, body);

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
