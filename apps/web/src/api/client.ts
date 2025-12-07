// apps/web/src/api/client.ts
const BASE_URL = '/api';

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json as T;
}

export const apiClient = {
  get: <T>(endpoint: string) => fetchJson<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => fetchJson<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) => fetchJson<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => fetchJson<T>(endpoint, { method: 'DELETE' }),
};
