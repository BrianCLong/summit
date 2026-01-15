export interface TestInvestigationInput {
  name: string;
  tenantId: string;
}

export interface TestEntityInput {
  id: string;
  type: string;
  label?: string;
  from?: string;
  to?: string;
  relationshipType?: string;
  properties?: Record<string, unknown>;
}

export async function createTestInvestigation(
  _input: TestInvestigationInput,
): Promise<string> {
  throw new Error(
    'createTestInvestigation is only available when RUN_ACCEPTANCE=true and a real test harness is implemented.',
  );
}

export async function createTestEntities(
  _investigationId: string,
  _entities: TestEntityInput[],
): Promise<void> {
  throw new Error(
    'createTestEntities is only available when RUN_ACCEPTANCE=true and a real test harness is implemented.',
  );
}

export async function cleanupTestData(_investigationId: string): Promise<void> {
  return;
}
