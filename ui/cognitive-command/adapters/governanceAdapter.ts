import type { GovernanceGate, OutcomeReview, DecisionRecord } from '../types';

// Backend contract: Governance and policy integration
// Existing endpoint: assumed from RepoOS governance
// Required new endpoint: GET /api/v1/governance/gates
// Required new endpoint: GET /api/v1/governance/gates/:id
// Required new endpoint: POST /api/v1/governance/gates/:id/approve
// Required new endpoint: POST /api/v1/governance/gates/:id/reject
// Required new endpoint: GET /api/v1/governance/decisions
// Required new endpoint: GET /api/v1/governance/outcomes
// Required new endpoint: WS /api/v1/governance/stream
// Maps to: RepoOS, Policy Engine, Risk Forecaster, Entropy Monitor

export interface GovernanceAdapter {
  getGates(filters?: GovernanceFilters): Promise<GovernanceGate[]>;
  getGateById(id: string): Promise<GovernanceGate>;
  approveGate(id: string, approverId: string, rationale: string): Promise<GovernanceGate>;
  rejectGate(id: string, approverId: string, rationale: string): Promise<GovernanceGate>;
  getDecisions(filters?: DecisionFilters): Promise<DecisionRecord[]>;
  getOutcomeReviews(decisionId?: string): Promise<OutcomeReview[]>;
  subscribeToGates(callback: (update: GovernanceGate) => void): () => void;
}

export interface GovernanceFilters {
  status?: string[];
  riskLevel?: string[];
  linkedMissionId?: string;
}

export interface DecisionFilters {
  status?: string[];
  linkedMissionId?: string;
}

export function createGovernanceAdapter(baseUrl: string): GovernanceAdapter {
  return {
    async getGates(filters) {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status.join(','));
      if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel.join(','));
      const res = await fetch(`${baseUrl}/api/v1/governance/gates?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch gates: ${res.status}`);
      return res.json();
    },

    async getGateById(id) {
      const res = await fetch(`${baseUrl}/api/v1/governance/gates/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch gate ${id}: ${res.status}`);
      return res.json();
    },

    async approveGate(id, approverId, rationale) {
      const res = await fetch(`${baseUrl}/api/v1/governance/gates/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId, rationale }),
      });
      if (!res.ok) throw new Error(`Failed to approve gate: ${res.status}`);
      return res.json();
    },

    async rejectGate(id, approverId, rationale) {
      const res = await fetch(`${baseUrl}/api/v1/governance/gates/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId, rationale }),
      });
      if (!res.ok) throw new Error(`Failed to reject gate: ${res.status}`);
      return res.json();
    },

    async getDecisions(filters) {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status.join(','));
      const res = await fetch(`${baseUrl}/api/v1/governance/decisions?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch decisions: ${res.status}`);
      return res.json();
    },

    async getOutcomeReviews(decisionId) {
      const params = decisionId ? `?decisionId=${decisionId}` : '';
      const res = await fetch(`${baseUrl}/api/v1/governance/outcomes${params}`);
      if (!res.ok) throw new Error(`Failed to fetch outcomes: ${res.status}`);
      return res.json();
    },

    subscribeToGates(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/governance/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
