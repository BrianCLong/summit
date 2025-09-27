import { StreamingDpAggregator } from '../src/privacy/dp/StreamingDpAggregator';

describe('StreamingDpAggregator', () => {
  const charges: Record<string, number> = {};
  const accountant = { charge: async (k: string, e: number) => { charges[k] = (charges[k] || 0) + e; } };
  const agg = new StreamingDpAggregator(accountant, 25);

  it('rejects small batches', async () => {
    await expect(agg.processBatch('s', Array(10).fill(1))).rejects.toThrow('k_anonymity_violated');
  });

  it('charges epsilon and returns noisy value', async () => {
    const res = await agg.processBatch('s', Array(30).fill(1));
    expect(res.meta.k).toBe(30);
    expect(charges['dp:stream:s']).toBeCloseTo(0.1);
  });
});
