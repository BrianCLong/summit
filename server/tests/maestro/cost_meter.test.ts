import { CostMeter } from '../../src/maestro/cost_meter';
import { IntelGraphClientImpl } from '../../src/intelgraph/client';

describe('CostMeter', () => {
  let costMeter: CostMeter;
  let ig: IntelGraphClientImpl;

  const pricingTable = {
    'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
  };

  beforeEach(() => {
    ig = new IntelGraphClientImpl();
    costMeter = new CostMeter(ig, pricingTable);
  });

  it('should estimate cost correctly', () => {
    const cost = costMeter.estimateCost({
      model: 'gpt-4',
      vendor: 'openai',
      inputTokens: 1000,
      outputTokens: 1000,
    });
    // 1000/1000 * 0.03 + 1000/1000 * 0.06 = 0.09
    expect(cost).toBeCloseTo(0.09);
  });

  it('should return 0 for unknown model', () => {
    const cost = costMeter.estimateCost({
      model: 'unknown-model',
      vendor: 'openai',
      inputTokens: 1000,
      outputTokens: 1000,
    });
    expect(cost).toBe(0);
  });

  it('should record cost sample', async () => {
    const sample = await costMeter.record('run-1', 'task-1', {
      model: 'gpt-4',
      vendor: 'openai',
      inputTokens: 1000,
      outputTokens: 1000,
    });

    expect(sample.cost).toBeCloseTo(0.09);
    expect(sample.runId).toBe('run-1');

    const summary = await costMeter.summarize('run-1');
    expect(summary.totalCostUSD).toBeCloseTo(0.09);
    expect(summary.totalInputTokens).toBe(1000);
  });
});
