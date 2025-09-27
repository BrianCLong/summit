import { CoecClient, ExperimentConfig, MetricSubmission } from '../src/coec/client';

describe('CoecClient', () => {
  const baseUrl = 'https://coec.test';

  const makeFetch = () => jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => new Response(null));

  it('registers an experiment and returns key material', async () => {
    const fetchMock = makeFetch();
    const responsePayload = {
      experiment: { id: 'exp-1', cohorts: [], metrics: [], organisations: [] } as ExperimentConfig,
      vrfKey: 'secret',
      publicKeys: { orgA: 'pub' },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responsePayload), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new CoecClient(baseUrl, fetchMock);
    const experimentConfig: ExperimentConfig = {
      id: 'exp-1',
      cohorts: [{ name: 'control', fraction: 0.5 }],
      metrics: [],
      organisations: [{ orgId: 'orgA' }],
    };

    const result = await client.registerExperiment(experimentConfig);
    expect(result).toEqual(responsePayload);
    expect(fetchMock).toHaveBeenCalledWith('https://coec.test/experiments', expect.objectContaining({ method: 'POST' }));
  });

  it('submits metrics without expecting a response body', async () => {
    const fetchMock = makeFetch();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }));

    const client = new CoecClient(baseUrl, fetchMock);
    const submission: MetricSubmission = {
      orgId: 'orgA',
      cohort: 'control',
      mask: 0,
      count: 100,
      metrics: { ctr: 0.5 },
    };

    await expect(client.submitMetrics('exp-1', submission)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://coec.test/experiments/exp-1/metrics',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('raises descriptive errors when the service responds with failure', async () => {
    const fetchMock = makeFetch();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new CoecClient(baseUrl, fetchMock);
    await expect(client.getBrief('exp-1', 'orgA')).rejects.toThrow('invalid');
  });
});
