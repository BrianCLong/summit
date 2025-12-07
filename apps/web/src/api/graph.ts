// apps/web/src/api/graph.ts
import { apiClient } from './client';
import type { GraphData } from './types';

export const graphApi = {
  getGraphForCase: (caseId: string) => {
    // In a real app, this would call the backend.
    // For now, we'll return a promise that resolves with data, possibly mocked if the backend isn't ready.
    return apiClient.get<GraphData>(`/cases/${caseId}/graph`);
  },

  queryGraph: (query: string) => {
    return apiClient.post<GraphData>('/graph/query', { query });
  }
};
