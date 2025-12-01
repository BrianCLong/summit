
import MetricsCollector from '../metrics-collector';

describe('MetricsCollector', () => {
  let metricsCollector: typeof MetricsCollector;

  beforeEach(() => {
    metricsCollector = MetricsCollector;
    metricsCollector._resetForTesting();
  });

  test('should track latency', () => {
    metricsCollector.trackLatency('endpoint-1', 100);
    metricsCollector.trackLatency('endpoint-1', 200);
    const metrics: any = metricsCollector.getMetrics();
    expect(metrics.latencies['endpoint-1']).toEqual([100, 200]);
  });

  test('should increment request count', () => {
    metricsCollector.incrementRequestCount('service-1');
    metricsCollector.incrementRequestCount('service-1');
    const metrics: any = metricsCollector.getMetrics();
    expect(metrics.requestCounts['service-1']).toBe(2);
  });

  test('should increment error count and manage sliding window', () => {
    const service = 'service-1';
    const now = Date.now();
    // Mock Date.now() to control the time
    const RealDateNow = Date.now;
    global.Date.now = jest.fn(() => now);

    metricsCollector.incrementErrorCount(service);
    metricsCollector.incrementErrorCount(service);
    let metrics: any = metricsCollector.getMetrics();
    expect(metrics.errorCounts[service].count).toBe(2);
    expect(metrics.errorCounts[service].history).toEqual([now, now]);

    // Simulate time passing (11 minutes)
    global.Date.now = jest.fn(() => now + 11 * 60 * 1000);
    metricsCollector.incrementErrorCount(service);
    metrics = metricsCollector.getMetrics();
    // The old errors should have expired from the history
    expect(metrics.errorCounts[service].history.length).toBe(1);
    expect(metrics.errorCounts[service].count).toBe(3);

    // Restore Date.now()
    global.Date.now = RealDateNow;
  });
});
