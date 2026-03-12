import type { AutonomousTask, AgentOutput } from '../types';

// Backend contract: Agent systems integration
// Existing endpoint: assumed from Maestro orchestration
// Required new endpoint: GET /api/v1/agents/tasks
// Required new endpoint: GET /api/v1/agents/:agentId/outputs
// Required new endpoint: POST /api/v1/agents/:agentId/approve
// Required new endpoint: POST /api/v1/agents/:agentId/reject
// Required new endpoint: POST /api/v1/agents/:agentId/pause
// Required new endpoint: WS /api/v1/agents/stream
// Maps to: Agent systems, Investigation Memory

export interface AutonomyAdapter {
  getTasks(filters?: AgentTaskFilters): Promise<AutonomousTask[]>;
  getTaskById(taskId: string): Promise<AutonomousTask>;
  getAgentOutputs(agentId: string): Promise<AgentOutput[]>;
  approveAction(agentId: string, actionId: string): Promise<void>;
  rejectAction(agentId: string, actionId: string, reason: string): Promise<void>;
  pauseAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string): Promise<void>;
  subscribeToAgents(callback: (update: AutonomousTask) => void): () => void;
}

export interface AgentTaskFilters {
  status?: string[];
  missionId?: string;
  priority?: string[];
  policyState?: string[];
}

export function createAutonomyAdapter(baseUrl: string): AutonomyAdapter {
  return {
    async getTasks(filters) {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status.join(','));
      if (filters?.missionId) params.set('missionId', filters.missionId);
      const res = await fetch(`${baseUrl}/api/v1/agents/tasks?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch agent tasks: ${res.status}`);
      return res.json();
    },

    async getTaskById(taskId) {
      const res = await fetch(`${baseUrl}/api/v1/agents/tasks/${taskId}`);
      if (!res.ok) throw new Error(`Failed to fetch task ${taskId}: ${res.status}`);
      return res.json();
    },

    async getAgentOutputs(agentId) {
      const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/outputs`);
      if (!res.ok) throw new Error(`Failed to fetch outputs: ${res.status}`);
      return res.json();
    },

    async approveAction(agentId, actionId) {
      const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      if (!res.ok) throw new Error(`Failed to approve action: ${res.status}`);
    },

    async rejectAction(agentId, actionId, reason) {
      const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, reason }),
      });
      if (!res.ok) throw new Error(`Failed to reject action: ${res.status}`);
    },

    async pauseAgent(agentId) {
      const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/pause`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to pause agent: ${res.status}`);
    },

    async resumeAgent(agentId) {
      const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/resume`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to resume agent: ${res.status}`);
    },

    subscribeToAgents(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/agents/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
