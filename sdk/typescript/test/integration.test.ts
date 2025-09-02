import { createClient } from '../src'; // Assuming src/index.ts exports createClient
import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Assuming dev stub runs on port 3000
const TEST_RUN_ID = 'test-run-123'; // A dummy run ID for testing

describe('Maestro SDK Integration Tests', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(BASE_URL);
  });

  it('should get a run by ID', async () => {
    // Mock the API response for /runs/:id
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { id: TEST_RUN_ID, status: 'SUCCESS', pipeline: 'test-pipeline' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const run = await client.getRunById(TEST_RUN_ID); // Assuming getRunById is available
    expect(run.data.id).toBe(TEST_RUN_ID);
    expect(run.data.status).toBe('SUCCESS');
  });

  it('should tail run logs', async () => {
    // Mock the API response for /runs/:id/logs?stream=true
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: 'log line 1\nlog line 2',
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/event-stream' },
      config: {},
    });

    const logs = await client.tailLogs(TEST_RUN_ID); // Assuming tailLogs is available
    expect(logs).toContain('log line 1');
  });

  it('should explain policies', async () => {
    // Mock the API response for /policies/explain
    jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { explanation: 'Policy allows access based on role.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const policy = await client.explainPolicy({ policyId: 'test-policy' }); // Assuming explainPolicy is available
    expect(policy.data.explanation).toContain('Policy allows access');
  });
});
