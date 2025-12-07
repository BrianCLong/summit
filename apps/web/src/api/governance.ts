// apps/web/src/api/governance.ts
import { apiClient } from './client';
import type { GovernanceLabel } from './types';

export const governanceApi = {
  getLabels: (entityIds: string[]) => {
    return apiClient.post<GovernanceLabel[]>('/governance/labels', { entityIds });
  },

  checkAccess: (resourceId: string, action: string) => {
    return apiClient.post<{ allowed: boolean; reason?: string }>('/governance/access', { resourceId, action });
  }
};
