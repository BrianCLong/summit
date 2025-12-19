// Mock for evidenceRepo
export const getLatestEvidence = jest.fn(async (_service?: string, _release?: string, _tenantId?: string) => []);
export const listEvidence = jest.fn(async () => []);
