const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');
}

export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

async function request<T>(path: string, init: RequestInit = {}, unwrapData = true): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json();

  if (!res.ok) {
    const err = body.error ?? { code: 'internal', message: 'Unexpected error' };
    throw new ApiException(res.status, err.code, err.message);
  }

  return (unwrapData ? body.data : body) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    let code = 'internal', message = 'Unexpected error';
    try { const body = await res.json(); code = body.error?.code ?? code; message = body.error?.message ?? message; } catch { /* non-JSON error body */ }
    throw new ApiException(res.status, code, message);
  }
  return res.blob();
}

export const api = {
  get:     <T>(path: string)                => request<T>(path),
  getBody: <T>(path: string)                => request<T>(path, {}, false),
  getBlob:    (path: string)                => requestBlob(path),
  post:    <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:     <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:   <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:     (path: string)                => request<void>(path, { method: 'DELETE' }),
};
