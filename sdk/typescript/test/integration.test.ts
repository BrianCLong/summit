import axios from 'axios';
import { createClient } from '../src';

const BASE_URL = 'http://localhost:3000';
const TEST_RUN_ID = 'run-123';

describe('Maestro SDK integration', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(BASE_URL);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches a run by id through axios', async () => {
    const getSpy = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { id: TEST_RUN_ID, status: 'SUCCESS', pipeline: 'demo' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const response = await client.getRunById(TEST_RUN_ID);

    expect(getSpy).toHaveBeenCalledWith(`/runs/${TEST_RUN_ID}`, undefined);
    expect(response.data.id).toBe(TEST_RUN_ID);
  });

  it('lists runs via the generated client', async () => {
    const getSpy = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: [{ id: 'run-1', status: 'RUNNING', pipeline: 'demo' }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    const response = await client.listRuns();

    expect(getSpy).toHaveBeenCalledWith('/runs', undefined);
    expect(response.data).toHaveLength(1);
  });

  it('creates a run with axios.post', async () => {
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { id: 'run-2', status: 'QUEUED', pipeline: 'demo' },
      status: 202,
      statusText: 'Accepted',
      headers: {},
      config: {},
    });

    const response = await client.createRun({ pipelineId: 'demo', estimatedCost: 10 });

    expect(postSpy).toHaveBeenCalledWith('/runs', { pipelineId: 'demo', estimatedCost: 10 }, undefined);
    expect(response.data.status).toBe('QUEUED');
  });
});
