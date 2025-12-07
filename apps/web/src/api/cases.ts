// apps/web/src/api/cases.ts
import { apiClient } from './client';
import type { Case, Task, Evidence } from './types';

export const casesApi = {
  listCases: () => {
    return apiClient.get<Case[]>('/cases');
  },

  getCase: (id: string) => {
    return apiClient.get<Case>(`/cases/${id}`);
  },

  createCase: (data: Partial<Case>) => {
    return apiClient.post<Case>('/cases', data);
  },

  getTasks: (caseId: string) => {
    return apiClient.get<Task[]>(`/cases/${caseId}/tasks`);
  },

  getEvidence: (caseId: string) => {
    return apiClient.get<Evidence[]>(`/cases/${caseId}/evidence`);
  }
};
