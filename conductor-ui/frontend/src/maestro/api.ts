import axios from 'axios';
import {
  DashboardData,
  Run,
  AgentProfile,
  MergeTrain,
  Experiment,
  AuditEvent,
  AutonomicLoop,
} from './types';

const client = axios.create({
  baseURL: '/api/maestro',
});

// Add auth token if available (simple implementation)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  dashboard: {
    get: async (): Promise<DashboardData> => {
      const res = await client.get('/dashboard');
      return res.data;
    },
  },
  runs: {
    list: async (params?: { limit?: number; offset?: number }): Promise<Run[]> => {
      const res = await client.get('/runs', { params });
      return res.data;
    },
    get: async (id: string): Promise<Run> => {
      const res = await client.get(`/runs/${id}`);
      return res.data;
    },
    getGraph: async (id: string): Promise<any> => {
      const res = await client.get(`/runs/${id}/graph`);
      return res.data;
    },
  },
  agents: {
    list: async (): Promise<AgentProfile[]> => {
      const res = await client.get('/agents');
      return res.data;
    },
    update: async (id: string, data: Partial<AgentProfile>): Promise<AgentProfile> => {
      const res = await client.patch(`/agents/${id}`, data);
      return res.data;
    },
  },
  autonomic: {
    listLoops: async (): Promise<AutonomicLoop[]> => {
      const res = await client.get('/autonomic/loops');
      return res.data;
    },
    toggleLoop: async (id: string, status: 'active' | 'paused'): Promise<boolean> => {
      const res = await client.post(`/autonomic/loops/${id}/toggle`, { status });
      return res.data.success;
    },
  },
  mergeTrain: {
    getStatus: async (): Promise<MergeTrain> => {
      const res = await client.get('/merge-trains');
      return res.data;
    },
  },
  experiments: {
    list: async (): Promise<Experiment[]> => {
      const res = await client.get('/experiments');
      return res.data;
    },
  },
  audit: {
    getLog: async (): Promise<AuditEvent[]> => {
      const res = await client.get('/audit/log');
      return res.data;
    },
  },
};
