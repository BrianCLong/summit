import type { MissionCommandState, MissionDependency, IntelligenceGap, MissionBlocker } from '../types';

// Backend contract: Mission command integration
// Existing endpoint: GET /api/v1/missions (assumed from mission-control feature)
// Required new endpoint: GET /api/v1/missions/:id/command-state
// Required new endpoint: GET /api/v1/missions/:id/dependencies
// Required new endpoint: GET /api/v1/missions/:id/intel-gaps
// Required new endpoint: PATCH /api/v1/missions/:id/state
// Required new endpoint: WS /api/v1/missions/stream
// Maps to: Investigation Memory, Agent systems, Simulation Engine

export interface MissionAdapter {
  getMissions(filters?: MissionFilters): Promise<MissionCommandState[]>;
  getMissionById(id: string): Promise<MissionCommandState>;
  getDependencies(missionId: string): Promise<MissionDependency[]>;
  getIntelligenceGaps(missionId: string): Promise<IntelligenceGap[]>;
  updateMissionState(id: string, state: MissionCommandState['state']): Promise<MissionCommandState>;
  subscribeToMissions(callback: (update: MissionCommandState) => void): () => void;
}

export interface MissionFilters {
  state?: string[];
  priority?: string[];
  assignedTo?: string;
}

export function createMissionAdapter(baseUrl: string): MissionAdapter {
  return {
    async getMissions(filters) {
      const params = new URLSearchParams();
      if (filters?.state) params.set('state', filters.state.join(','));
      if (filters?.priority) params.set('priority', filters.priority.join(','));
      const res = await fetch(`${baseUrl}/api/v1/missions?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch missions: ${res.status}`);
      return res.json();
    },

    async getMissionById(id) {
      const res = await fetch(`${baseUrl}/api/v1/missions/${id}/command-state`);
      if (!res.ok) throw new Error(`Failed to fetch mission ${id}: ${res.status}`);
      return res.json();
    },

    async getDependencies(missionId) {
      const res = await fetch(`${baseUrl}/api/v1/missions/${missionId}/dependencies`);
      if (!res.ok) throw new Error(`Failed to fetch dependencies: ${res.status}`);
      return res.json();
    },

    async getIntelligenceGaps(missionId) {
      const res = await fetch(`${baseUrl}/api/v1/missions/${missionId}/intel-gaps`);
      if (!res.ok) throw new Error(`Failed to fetch intel gaps: ${res.status}`);
      return res.json();
    },

    async updateMissionState(id, state) {
      const res = await fetch(`${baseUrl}/api/v1/missions/${id}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      if (!res.ok) throw new Error(`Failed to update mission state: ${res.status}`);
      return res.json();
    },

    subscribeToMissions(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/missions/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
