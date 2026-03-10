import type { CognitiveInsight, InsightCategory } from '../types';

// Backend contract: Unified insight stream integration
// Required new endpoint: GET /api/v1/insights
// Required new endpoint: GET /api/v1/insights/:id
// Required new endpoint: PATCH /api/v1/insights/:id/triage
// Required new endpoint: POST /api/v1/insights/:id/action
// Required new endpoint: WS /api/v1/insights/stream
// Maps to: IntelGraph, Narrative Intelligence, CWMI, VTII, Agent systems

export interface InsightAdapter {
  getInsights(filters?: InsightFilters): Promise<CognitiveInsight[]>;
  getInsightById(id: string): Promise<CognitiveInsight>;
  triageInsight(id: string, status: CognitiveInsight['status'], triagedBy: string): Promise<CognitiveInsight>;
  createInvestigationFromInsight(insightId: string): Promise<{ investigationId: string }>;
  createMissionFromInsight(insightId: string): Promise<{ missionId: string }>;
  subscribeToInsights(callback: (insight: CognitiveInsight) => void): () => void;
}

export interface InsightFilters {
  category?: InsightCategory[];
  urgency?: string[];
  status?: string[];
  linkedMissionId?: string;
  minConfidence?: number;
}

export function createInsightAdapter(baseUrl: string): InsightAdapter {
  return {
    async getInsights(filters) {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category.join(','));
      if (filters?.urgency) params.set('urgency', filters.urgency.join(','));
      if (filters?.status) params.set('status', filters.status.join(','));
      if (filters?.minConfidence) params.set('minConfidence', String(filters.minConfidence));
      const res = await fetch(`${baseUrl}/api/v1/insights?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch insights: ${res.status}`);
      return res.json();
    },

    async getInsightById(id) {
      const res = await fetch(`${baseUrl}/api/v1/insights/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch insight ${id}: ${res.status}`);
      return res.json();
    },

    async triageInsight(id, status, triagedBy) {
      const res = await fetch(`${baseUrl}/api/v1/insights/${id}/triage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, triagedBy }),
      });
      if (!res.ok) throw new Error(`Failed to triage insight: ${res.status}`);
      return res.json();
    },

    async createInvestigationFromInsight(insightId) {
      const res = await fetch(`${baseUrl}/api/v1/insights/${insightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_investigation' }),
      });
      if (!res.ok) throw new Error(`Failed to create investigation: ${res.status}`);
      return res.json();
    },

    async createMissionFromInsight(insightId) {
      const res = await fetch(`${baseUrl}/api/v1/insights/${insightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_mission' }),
      });
      if (!res.ok) throw new Error(`Failed to create mission: ${res.status}`);
      return res.json();
    },

    subscribeToInsights(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/insights/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
