import { createClient } from '../src'; // Assuming src/index.ts exports createClient
import axios from 'axios';

jest.mock('../sdk/ts/src/generated', () => {
  const api = {
    getRunById: jest.fn(),
    tailLogs: jest.fn(),
    explainPolicy: jest.fn(),
  };
  return {
    getMaestroOrchestrationAPI: () => api,
    __mockedApi: api,
  };
});

const mockedModule = jest.requireMock('../sdk/ts/src/generated') as {
  __mockedApi: {
    getRunById: jest.Mock;
    tailLogs: jest.Mock;
    explainPolicy: jest.Mock;
  };
};

const BASE_URL = 'http://localhost:3000'; // Assuming dev stub runs on port 3000
const TEST_RUN_ID = 'test-run-123'; // A dummy run ID for testing

describe('Maestro SDK Integration Tests', () => {
  let client: any;

  beforeAll(() => {
    client = createClient(BASE_URL) as any;
  });

  beforeEach(() => {
    mockedModule.__mockedApi.getRunById.mockReset();
    mockedModule.__mockedApi.tailLogs.mockReset();
    mockedModule.__mockedApi.explainPolicy.mockReset();
  });

  it('should get a run by ID', async () => {
    mockedModule.__mockedApi.getRunById.mockResolvedValueOnce({
      data: { id: TEST_RUN_ID, status: 'SUCCESS', pipeline: 'test-pipeline' },
    });

    const run = await client.getRunById(TEST_RUN_ID); // Assuming getRunById is available
    expect(run.data.id).toBe(TEST_RUN_ID);
    expect(run.data.status).toBe('SUCCESS');
  });

  it('should tail run logs', async () => {
    mockedModule.__mockedApi.tailLogs.mockResolvedValueOnce({
      data: 'log line 1\nlog line 2',
    });

    const logs = await client.tailLogs(TEST_RUN_ID); // Assuming tailLogs is available
    expect(logs.data).toContain('log line 1');
  });

  it('should explain policies', async () => {
    mockedModule.__mockedApi.explainPolicy.mockResolvedValueOnce({
      data: { explanation: 'Policy allows access based on role.' },
    });

    const policy = await client.explainPolicy({ policyId: 'test-policy' }); // Assuming explainPolicy is available
    expect(policy.data.explanation).toContain('Policy allows access');
  });

  it('configures axios defaults when a token is provided', () => {
    createClient('https://api.example.com', 'secret-token');
    expect(axios.defaults.baseURL).toBe('https://api.example.com');
    expect(axios.defaults.headers.common['Authorization']).toBe('Bearer secret-token');
  });
});
