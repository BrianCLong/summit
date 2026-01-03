import type {
  Adversary,
  Detection,
  TacticEvent,
  DefenseStrategy,
  SimulationScenario,
  Incident,
  Campaign,
  Alert,
  IOC,
  Playbook,
  ThreatIntelItem,
  SecurityMetric,
  RiskScore,
  DetectionStatus,
  IncidentStatus,
  AlertStatus,
} from '../types';

const API_BASE = '/api/adversarial';

// Helper for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Adversaries
export const adversariesApi = {
  getAll: () => fetchApi<Adversary[]>('/adversaries'),

  getById: (id: string) => fetchApi<Adversary>(`/adversaries/${id}`),

  search: (query: string) =>
    fetchApi<Adversary[]>(`/adversaries/search?q=${encodeURIComponent(query)}`),

  getByThreatLevel: (level: string) =>
    fetchApi<Adversary[]>(`/adversaries?threatLevel=${level}`),

  track: (id: string) =>
    fetchApi<void>(`/adversaries/${id}/track`, { method: 'POST' }),

  untrack: (id: string) =>
    fetchApi<void>(`/adversaries/${id}/untrack`, { method: 'POST' }),
};

// Detections
export const detectionsApi = {
  getAll: () => fetchApi<Detection[]>('/detections'),

  getById: (id: string) => fetchApi<Detection>(`/detections/${id}`),

  getRecent: (limit = 10) =>
    fetchApi<Detection[]>(`/detections/recent?limit=${limit}`),

  updateStatus: (id: string, status: DetectionStatus) =>
    fetchApi<Detection>(`/detections/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  assign: (id: string, assignee: string) =>
    fetchApi<Detection>(`/detections/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee }),
    }),

  escalate: (id: string) =>
    fetchApi<Incident>(`/detections/${id}/escalate`, { method: 'POST' }),

  addNote: (id: string, note: string) =>
    fetchApi<Detection>(`/detections/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
};

// Tactic Events
export const tacticEventsApi = {
  getAll: () => fetchApi<TacticEvent[]>('/tactic-events'),

  getByTimeRange: (start: string, end: string) =>
    fetchApi<TacticEvent[]>(`/tactic-events?start=${start}&end=${end}`),

  getByTactic: (tactic: string) =>
    fetchApi<TacticEvent[]>(`/tactic-events?tactic=${tactic}`),
};

// Defense Strategies
export const defenseStrategiesApi = {
  getAll: () => fetchApi<DefenseStrategy[]>('/defense-strategies'),

  getById: (id: string) => fetchApi<DefenseStrategy>(`/defense-strategies/${id}`),

  create: (strategy: Omit<DefenseStrategy, 'id'>) =>
    fetchApi<DefenseStrategy>('/defense-strategies', {
      method: 'POST',
      body: JSON.stringify(strategy),
    }),

  update: (id: string, updates: Partial<DefenseStrategy>) =>
    fetchApi<DefenseStrategy>(`/defense-strategies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  activate: (id: string) =>
    fetchApi<DefenseStrategy>(`/defense-strategies/${id}/activate`, { method: 'POST' }),

  deprecate: (id: string) =>
    fetchApi<DefenseStrategy>(`/defense-strategies/${id}/deprecate`, { method: 'POST' }),
};

// Simulations
export const simulationsApi = {
  getAll: () => fetchApi<SimulationScenario[]>('/simulations'),

  getById: (id: string) => fetchApi<SimulationScenario>(`/simulations/${id}`),

  create: (scenario: Omit<SimulationScenario, 'id'>) =>
    fetchApi<SimulationScenario>('/simulations', {
      method: 'POST',
      body: JSON.stringify(scenario),
    }),

  start: (id: string) =>
    fetchApi<SimulationScenario>(`/simulations/${id}/start`, { method: 'POST' }),

  stop: (id: string) =>
    fetchApi<SimulationScenario>(`/simulations/${id}/stop`, { method: 'POST' }),

  reset: (id: string) =>
    fetchApi<SimulationScenario>(`/simulations/${id}/reset`, { method: 'POST' }),

  schedule: (id: string, scheduledAt: string) =>
    fetchApi<SimulationScenario>(`/simulations/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    }),
};

// Incidents
export const incidentsApi = {
  getAll: () => fetchApi<Incident[]>('/incidents'),

  getById: (id: string) => fetchApi<Incident>(`/incidents/${id}`),

  getOpen: () => fetchApi<Incident[]>('/incidents?status=open'),

  create: (incident: Omit<Incident, 'id'>) =>
    fetchApi<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    }),

  updateStatus: (id: string, status: IncidentStatus) =>
    fetchApi<Incident>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  assign: (id: string, assignee: string) =>
    fetchApi<Incident>(`/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee }),
    }),

  close: (id: string, rootCause?: string, lessonsLearned?: string) =>
    fetchApi<Incident>(`/incidents/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ rootCause, lessonsLearned }),
    }),
};

// Campaigns
export const campaignsApi = {
  getAll: () => fetchApi<Campaign[]>('/campaigns'),

  getById: (id: string) => fetchApi<Campaign>(`/campaigns/${id}`),

  getActive: () => fetchApi<Campaign[]>('/campaigns?status=active'),

  getByAdversary: (adversaryId: string) =>
    fetchApi<Campaign[]>(`/campaigns?adversary=${adversaryId}`),
};

// Alerts
export const alertsApi = {
  getAll: () => fetchApi<Alert[]>('/alerts'),

  getNew: () => fetchApi<Alert[]>('/alerts?status=new'),

  acknowledge: (id: string) =>
    fetchApi<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),

  resolve: (id: string) =>
    fetchApi<Alert>(`/alerts/${id}/resolve`, { method: 'POST' }),

  dismiss: (id: string) =>
    fetchApi<Alert>(`/alerts/${id}/dismiss`, { method: 'POST' }),

  bulkUpdate: (ids: string[], status: AlertStatus) =>
    fetchApi<Alert[]>('/alerts/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
    }),
};

// IOCs
export const iocsApi = {
  getAll: () => fetchApi<IOC[]>('/iocs'),

  create: (ioc: Omit<IOC, 'id'>) =>
    fetchApi<IOC>('/iocs', {
      method: 'POST',
      body: JSON.stringify(ioc),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/iocs/${id}`, { method: 'DELETE' }),

  whitelist: (id: string) =>
    fetchApi<IOC>(`/iocs/${id}/whitelist`, { method: 'POST' }),

  export: (format: 'csv' | 'stix' | 'misp', ids?: string[]) =>
    fetchApi<Blob>(`/iocs/export?format=${format}${ids ? `&ids=${ids.join(',')}` : ''}`, {
      headers: { Accept: 'application/octet-stream' },
    }),
};

// Playbooks
export const playbooksApi = {
  getAll: () => fetchApi<Playbook[]>('/playbooks'),

  getById: (id: string) => fetchApi<Playbook>(`/playbooks/${id}`),

  execute: (id: string) =>
    fetchApi<void>(`/playbooks/${id}/execute`, { method: 'POST' }),

  create: (playbook: Omit<Playbook, 'id'>) =>
    fetchApi<Playbook>('/playbooks', {
      method: 'POST',
      body: JSON.stringify(playbook),
    }),

  update: (id: string, updates: Partial<Playbook>) =>
    fetchApi<Playbook>(`/playbooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  export: (id: string, format: 'json' | 'yaml' | 'pdf') =>
    fetchApi<Blob>(`/playbooks/${id}/export?format=${format}`, {
      headers: { Accept: 'application/octet-stream' },
    }),
};

// Threat Intelligence
export const threatIntelApi = {
  getAll: () => fetchApi<ThreatIntelItem[]>('/threat-intel'),

  getRecent: (limit = 20) =>
    fetchApi<ThreatIntelItem[]>(`/threat-intel/recent?limit=${limit}`),

  search: (query: string) =>
    fetchApi<ThreatIntelItem[]>(`/threat-intel/search?q=${encodeURIComponent(query)}`),

  refresh: () =>
    fetchApi<ThreatIntelItem[]>('/threat-intel/refresh', { method: 'POST' }),
};

// Metrics
export const metricsApi = {
  getAll: () => fetchApi<SecurityMetric[]>('/metrics'),

  getByCategory: (category: string) =>
    fetchApi<SecurityMetric[]>(`/metrics?category=${category}`),

  getRiskScore: () => fetchApi<RiskScore>('/metrics/risk-score'),

  refresh: () =>
    fetchApi<SecurityMetric[]>('/metrics/refresh', { method: 'POST' }),
};

// Combined API
export const adversarialApi = {
  adversaries: adversariesApi,
  detections: detectionsApi,
  tacticEvents: tacticEventsApi,
  defenseStrategies: defenseStrategiesApi,
  simulations: simulationsApi,
  incidents: incidentsApi,
  campaigns: campaignsApi,
  alerts: alertsApi,
  iocs: iocsApi,
  playbooks: playbooksApi,
  threatIntel: threatIntelApi,
  metrics: metricsApi,
};

export default adversarialApi;
