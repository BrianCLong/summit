import type { WorldStateSnapshot, StateTransition, HistoricalAnalog } from '../types';

// Backend contract: assumed endpoints for CWMI world-model projections
// Required new endpoint: GET /api/v1/world-state/current
// Required new endpoint: GET /api/v1/world-state/history
// Required new endpoint: GET /api/v1/world-state/transitions
// Required new endpoint: GET /api/v1/world-state/analogs
// Required new endpoint: WS /api/v1/world-state/stream
// Maps to: CWMI, VTII, Simulation Engine

export interface WorldModelAdapter {
  getCurrentState(): Promise<WorldStateSnapshot>;
  getStateHistory(range: string): Promise<WorldStateSnapshot[]>;
  getTransitions(fromStateId?: string): Promise<StateTransition[]>;
  getHistoricalAnalogs(currentStateId: string): Promise<HistoricalAnalog[]>;
  subscribeToState(callback: (snapshot: WorldStateSnapshot) => void): () => void;
}

export function createWorldModelAdapter(baseUrl: string): WorldModelAdapter {
  return {
    async getCurrentState() {
      const res = await fetch(`${baseUrl}/api/v1/world-state/current`);
      if (!res.ok) throw new Error(`Failed to fetch world state: ${res.status}`);
      return res.json();
    },

    async getStateHistory(range) {
      const res = await fetch(`${baseUrl}/api/v1/world-state/history?range=${range}`);
      if (!res.ok) throw new Error(`Failed to fetch state history: ${res.status}`);
      return res.json();
    },

    async getTransitions(fromStateId) {
      const params = fromStateId ? `?from=${fromStateId}` : '';
      const res = await fetch(`${baseUrl}/api/v1/world-state/transitions${params}`);
      if (!res.ok) throw new Error(`Failed to fetch transitions: ${res.status}`);
      return res.json();
    },

    async getHistoricalAnalogs(currentStateId) {
      const res = await fetch(`${baseUrl}/api/v1/world-state/analogs?stateId=${currentStateId}`);
      if (!res.ok) throw new Error(`Failed to fetch analogs: ${res.status}`);
      return res.json();
    },

    subscribeToState(callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/world-state/stream`);
      ws.onmessage = (event) => callback(JSON.parse(event.data));
      return () => ws.close();
    },
  };
}
