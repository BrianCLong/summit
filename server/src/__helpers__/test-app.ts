import type { Express } from 'express';

export interface TestApp {
  app: Express;
  authToken: string;
  tenantId: string;
}

export async function setupTestApp(): Promise<TestApp> {
  throw new Error(
    'setupTestApp is only available when RUN_ACCEPTANCE=true and a real test harness is implemented.',
  );
}
