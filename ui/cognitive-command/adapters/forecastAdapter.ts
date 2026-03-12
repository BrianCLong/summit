import type { Forecast, ForecastBranch, ProbabilityShift, LeadingIndicator } from '../types';

// Backend contract: assumed endpoints for CWMI, VTII, and Evolution Intelligence forecast data
// Required new endpoint: GET /api/v1/forecasts
// Required new endpoint: GET /api/v1/forecasts/:id/branches
// Required new endpoint: GET /api/v1/forecasts/:id/shifts
// Required new endpoint: POST /api/v1/forecasts
// Required new endpoint: WS /api/v1/forecasts/stream

export interface ForecastAdapter {
  getForecasts(filters?: ForecastFilters): Promise<Forecast[]>;
  getForecastById(id: string): Promise<Forecast>;
  getBranches(forecastId: string): Promise<ForecastBranch[]>;
  getProbabilityShifts(forecastId: string, timeRange?: string): Promise<ProbabilityShift[]>;
  getLeadingIndicators(): Promise<LeadingIndicator[]>;
  createForecast(data: Omit<Forecast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Forecast>;
  subscribeTo(forecastId: string, callback: (update: Partial<Forecast>) => void): () => void;
}

export interface ForecastFilters {
  status?: string[];
  source?: string[];
  confidenceMin?: number;
  timeHorizonMax?: string;
  linkedMissionId?: string;
  tags?: string[];
}

export function createForecastAdapter(baseUrl: string): ForecastAdapter {
  return {
    async getForecasts(filters) {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status.join(','));
      if (filters?.source) params.set('source', filters.source.join(','));
      if (filters?.linkedMissionId) params.set('missionId', filters.linkedMissionId);
      const res = await fetch(`${baseUrl}/api/v1/forecasts?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch forecasts: ${res.status}`);
      return res.json();
    },

    async getForecastById(id) {
      const res = await fetch(`${baseUrl}/api/v1/forecasts/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch forecast ${id}: ${res.status}`);
      return res.json();
    },

    async getBranches(forecastId) {
      const res = await fetch(`${baseUrl}/api/v1/forecasts/${forecastId}/branches`);
      if (!res.ok) throw new Error(`Failed to fetch branches: ${res.status}`);
      return res.json();
    },

    async getProbabilityShifts(forecastId, timeRange = '24h') {
      const res = await fetch(`${baseUrl}/api/v1/forecasts/${forecastId}/shifts?range=${timeRange}`);
      if (!res.ok) throw new Error(`Failed to fetch shifts: ${res.status}`);
      return res.json();
    },

    async getLeadingIndicators() {
      const res = await fetch(`${baseUrl}/api/v1/indicators/leading`);
      if (!res.ok) throw new Error(`Failed to fetch indicators: ${res.status}`);
      return res.json();
    },

    async createForecast(data) {
      const res = await fetch(`${baseUrl}/api/v1/forecasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to create forecast: ${res.status}`);
      return res.json();
    },

    subscribeTo(forecastId, callback) {
      const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/v1/forecasts/${forecastId}/stream`);
      ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        callback(update);
      };
      return () => ws.close();
    },
  };
}
