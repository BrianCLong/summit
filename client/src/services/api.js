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

export const ExportAPI = {
  async graph(format = 'json', investigationId) {
    const token = localStorage.getItem('token');
    const url = new URL(`${apiBase()}/api/export/graph`);
    url.searchParams.set('format', format);
    if (investigationId) url.searchParams.set('investigationId', investigationId);
    const res = await fetch(url.toString(), { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    if (format === 'json') return res.json();
    const blob = await res.blob();
    return blob;
  }
};

export const ActivityAPI = {
  list: ({ page = 0, pageSize = 50, all = false, action = '', resource = '' } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('pageSize', String(pageSize));
    if (action) qs.set('action', action);
    if (resource) qs.set('resource', resource);
    return apiFetch(`/api/activity${all ? '/all' : ''}?${qs.toString()}`);
  },
};

export const TemplatesAPI = {
  list: ({ scope } = {}) => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    const query = qs.toString();
    return apiFetch(`/api/templates${query ? `?${query}` : ''}`);
  },
  create: (payload) => apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(payload) }),
  get: (id) => apiFetch(`/api/templates/${encodeURIComponent(id)}`),
  update: (id, payload) => apiFetch(`/api/templates/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => apiFetch(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const AdminAPI = {
  users: () => apiFetch('/api/admin/users'),
  setRole: (id, role) => apiFetch(`/api/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};

export const VisionAPI = {
  analyze: ({ imageUrl, imageBase64, mode }) => apiFetch('/api/vision/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, imageBase64, mode })
  }),
};

export const GeointAPI = {
  clusters: ({ points, epsilonKm = 0.1, minPoints = 3 }) => apiFetch('/api/geoint/clusters', {
    method: 'POST',
    body: JSON.stringify({ points, epsilonKm, minPoints })
  }),
  timeSeries: ({ points, intervalMinutes = 60 }) => apiFetch('/api/geoint/time-series', {
    method: 'POST',
    body: JSON.stringify({ points, intervalMinutes })
  }),
};
