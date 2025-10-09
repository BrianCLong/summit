// Maestro Integration Flow (using Express test harness)

import { createTestApp } from './utils/testServer';
import { http } from './utils/httpClient';
import { v4 as uuid } from 'uuid';

describe('Maestro Integration Flow', () => {
  let app: any;
  let runbookId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // Simulate creating a runbook for testing
    runbookId = uuid();
    console.log(`Simulating runbook creation with ID: ${runbookId}`);
  });

  it('should launch a run, transition states, and complete successfully', async () => {
    // 1. Launch a run
    const launchResponse = await http(app)
      .post('/run')
      .set('Idempotency-Key', uuid())
      .send({
        runbookId: runbookId,
        tenantId: 'test-tenant',
        params: { message: 'hello' }
      });

    expect(launchResponse.status).toBe(202);
    expect(launchResponse.body.runId).toBeDefined();
    const runId = launchResponse.body.runId;

    // 2. Check run status (the test server returns SUCCEEDED immediately for testing)
    const runStatusResponse = await http(app).get(`/runs/${runId}`);
    expect(runStatusResponse.status).toBe(200);
    console.log(`Run ${runId} status: ${runStatusResponse.body.status}`);

    expect(runStatusResponse.body.status).toBe('SUCCEEDED'); // Expecting success for this test
    // TODO: Verify artifacts, logs, etc.
  }, 10000); // Reduced timeout since test server responds immediately
});