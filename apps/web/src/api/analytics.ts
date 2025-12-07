// apps/web/src/api/analytics.ts
import { apiClient } from './client';
import type { AnalyticsEvent, AnalyticsLocation } from './types';

export const analyticsApi = {
  getEventsForCase: (caseId: string) => {
    return apiClient.get<AnalyticsEvent[]>(`/cases/${caseId}/events`);
  },

  getLocationsForCase: (caseId: string) => {
    return apiClient.get<AnalyticsLocation[]>(`/cases/${caseId}/locations`);
  },

  getExplanation: (viewState: unknown) => {
    return apiClient.post<{ explanation: string; metrics: unknown }>('/analytics/explain', { viewState });
  }
};
