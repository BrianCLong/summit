import { metrics } from '../metrics/metrics.js';
import { registry } from '../metrics.js';

describe('Observability Metrics', () => {
  beforeEach(() => {
    registry.clear();
  });

  it('should increment a counter', async () => {
    metrics.incrementCounter('test_counter', { label: 'value' });

    const metric = await registry.getSingleMetric('test_counter')?.get();
    expect(metric).toBeDefined();
    expect(metric?.type).toBe('counter');
    expect(metric?.values[0].value).toBe(1);
    expect(metric?.values[0].labels).toEqual({ label: 'value' });
  });

  it('should observe histogram', async () => {
    metrics.observeHistogram('test_histogram', 0.5, { label: 'value' });

    const metric = await registry.getSingleMetric('test_histogram')?.get();
    expect(metric).toBeDefined();
    expect(metric?.type).toBe('histogram');
    // Check if sum includes the value
    const sum = metric?.values.find(v => v.metricName === 'test_histogram_sum');
    expect(sum?.value).toBe(0.5);
  });
});
