import { SliceRegClient } from '../src/sliceRegClient';

type SliceHandle = {
  name: string;
  version: string;
};

describe('SliceRegClient', () => {
  const baseUrl = 'https://slice-reg.test';

  beforeEach(() => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches a slice using getSliceHandle', async () => {
    const handle: SliceHandle = { name: 'fairness', version: 'v1' };
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'fairness',
        version: 'v1',
        members: ['1'],
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        source: null,
        membership_hash: 'abc',
        provenance_hash: 'def',
        cardinality: 1,
      }),
    });

    const client = new SliceRegClient(baseUrl);
    const slice = await client.getSliceHandle(handle);
    expect(slice.version).toBe('v1');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://slice-reg.test/slices/fairness/v1', undefined);
  });

  it('computes coverage for provided traffic events', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        slice: {
          name: 'stress',
          version: 'v1',
          members: ['1'],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          source: null,
          membership_hash: 'abc',
          provenance_hash: 'def',
          cardinality: 1,
        },
        traffic_total: 2,
        captured_weight: 1,
        coverage: 0.5,
        label_totals: { toxic: 2 },
        captured_by_label: { toxic: 1 },
        label_coverage: { toxic: 0.5 },
      }),
    });

    const client = new SliceRegClient(baseUrl);
    const coverage = await client.coverage('stress', 'v1', [{ id: '1', label: 'toxic' }]);
    expect(coverage.coverage).toBe(0.5);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://slice-reg.test/slices/stress/v1/coverage',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
