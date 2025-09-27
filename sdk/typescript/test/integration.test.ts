import { createClient } from '../src'; // Assuming src/index.ts exports createClient
import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Assuming dev stub runs on port 3000
const TEST_RUN_ID = 'test-run-123'; // A dummy run ID for testing

describe('Maestro SDK Integration Tests', () => {
  let client: ReturnType<typeof createClient>;
  let typedClient: any;

  beforeAll(() => {
    client = createClient(BASE_URL);
    typedClient = client as any;
  });

  it('should get a run by ID', async () => {
    // Mock the API response for /runs/:id
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { id: TEST_RUN_ID, status: 'SUCCESS', pipeline: 'test-pipeline' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { url: `${BASE_URL}/runs/${TEST_RUN_ID}` },
    });

    const run = await typedClient.getRunById(TEST_RUN_ID);
    expect(run.data.id).toBe(TEST_RUN_ID);
    expect(run.data.status).toBe('SUCCESS');
  });

  it('should list runs with retries', async () => {
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: [{ id: 'run-1' }, { id: 'run-2' }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { url: `${BASE_URL}/runs` },
    });

    const runs = await typedClient.listRuns();
    expect(runs.data).toHaveLength(2);
  });

  it('should list alert events', async () => {
    jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { events: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { url: `${BASE_URL}/alertcenter/events` },
    });

    const events = await typedClient.listAlertEvents();
    expect(events.status).toBe(200);
  });
});
