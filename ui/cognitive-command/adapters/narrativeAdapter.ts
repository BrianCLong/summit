import type { NarrativeCluster, InfluenceFlow, PropagationEvent, CounterNarrative } from '../types';

// Backend contract: Narrative Intelligence engine integration
// Required new endpoint: GET /api/v1/narratives/clusters
// Required new endpoint: GET /api/v1/narratives/flows
// Required new endpoint: GET /api/v1/narratives/propagation
// Required new endpoint: POST /api/v1/narratives/counter
// Required new endpoint: WS /api/v1/narratives/stream
// Maps to: Narrative Intelligence, IntelGraph, Threat Intelligence

export interface NarrativeAdapter {
  getClusters(filters?: NarrativeFilters): Promise<NarrativeCluster[]>;
  getInfluenceFlows(clusterId?: string): Promise<InfluenceFlow[]>;
  getPropagationEvents(clusterId: string, timeRange?: string): Promise<PropagationEvent[]>;
  getCounterNarratives(targetClusterId?: string): Promise<CounterNarrative[]>;
  createCounterNarrative(data: Omit<CounterNarrative, 'id' | 'createdAt'>): Promise<CounterNarrative>;
  subscribeToNarratives(callback: (update: NarrativeUpdate) => void): () => void;
}

export interface NarrativeFilters {
  stance?: string[];
  minReach?: number;
  minCoherence?: number;
  channels?: string[];
  linkedEntityIds?: string[];
}

export interface NarrativeUpdate {
  type: 'cluster_update' | 'new_flow' | 'propagation_event';
  data: NarrativeCluster | InfluenceFlow | PropagationEvent;
}

export function createNarrativeAdapter(baseUrl: string): NarrativeAdapter {
  return {
    async getClusters(filters) {
      const params = new URLSearchParams();
      if (filters?.stance) params.set('stance', filters.stance.join(','));
      if (filters?.minReach) params.set('minReach', String(filters.minReach));
      const res = await fetch(`${baseUrl}/api/v1/narratives/clusters?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch clusters: ${res.status}`);
      return res.json();
    },

    async getInfluenceFlows(clusterId) {
      const params = clusterId ? `?clusterId=${clusterId}` : '';
      const res = await fetch(`${baseUrl}/api/v1/narratives/flows${params}`);
      if (!res.ok) throw new Error(`Failed to fetch flows: ${res.status}`);
      return res.json();
    },

    async getPropagationEvents(clusterId, timeRange = '24h') {
      const res = await fetch(`${baseUrl}/api/v1/narratives/propagation?clusterId=${clusterId}&range=${timeRange}`);
      if (!res.ok) throw new Error(`Failed to fetch propagation events: ${res.status}`);
      return res.json();
    },

    async getCounterNarratives(targetClusterId) {
      const params = targetClusterId ? `?targetId=${targetClusterId}` : '';
      const res = await fetch(`${baseUrl}/api/v1/narratives/counter${params}`);
      if (!res.ok) throw new Error(`Failed to fetch counter-narratives: ${res.status}`);
      return res.json();
    },

    async createCounterNarrative(data) {
      const res = await fetch(`${baseUrl}/api/v1/narratives/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to create counter-narrative: ${res.status}`);
      return res.json();
    },

    subscribeToNarratives(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/narratives/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
