export function apiBase() {
  const root = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return root.replace(/\/$/, '');
}

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

export const FederationAPI = {
  listInstances: () => apiFetch('/api/federation/instances'),
  register: (payload) => apiFetch('/api/federation/instances', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/api/federation/instances/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => apiFetch(`/api/federation/instances/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  test: (id) => apiFetch(`/api/federation/instances/${encodeURIComponent(id)}/test`, { method: 'POST' }),
  get: (id) => apiFetch(`/api/federation/instances/${encodeURIComponent(id)}`),
};

export const ReportAPI = {
  generate: (payload) => apiFetch('/api/reports/generate', { method: 'POST', body: JSON.stringify(payload) }),
};

export const MLAPI = {
  train: (payload) => apiFetch('/api/ml/train', { method: 'POST', body: JSON.stringify(payload || {}) }),
  suggestLinks: (payload) => apiFetch('/api/ml/suggest-links', { method: 'POST', body: JSON.stringify(payload) }),
};

export const SystemAPI = {
  version: () => apiFetch('/api/version'),
  health: () => apiFetch('/api/healthz'),
  ready: () => apiFetch('/api/readyz'),
};
