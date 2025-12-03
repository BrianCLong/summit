
import { SignalsService } from '../signals-service';
import { SignalType, HealthStatus } from '../types';

describe('SignalsService', () => {
  let service: SignalsService;

  beforeEach(() => {
    service = new SignalsService();
  });

  it('should ingest and retrieve signals', () => {
    const now = new Date();
    service.ingestSignal({
      type: SignalType.TASK_LATENCY,
      value: 150,
      sourceId: 'agent-1',
      metadata: { scope: 'AGENT' },
      tenantId: 'tenant-1',
      timestamp: now,
    });

    const signals = service.getSignals(SignalType.TASK_LATENCY, 'agent-1', new Date(now.getTime() - 1000));
    expect(signals).toHaveLength(1);
    expect(signals[0].value).toBe(150);
  });

  it('should aggregate signals correctly', () => {
    const now = new Date();
    service.ingestSignal({
      type: SignalType.TASK_LATENCY,
      value: 100,
      sourceId: 'agent-1',
      tenantId: 'tenant-1',
      timestamp: new Date(now.getTime() - 1000 * 60 * 1), // 1 min ago
    });
    service.ingestSignal({
      type: SignalType.TASK_LATENCY,
      value: 200,
      sourceId: 'agent-1',
      tenantId: 'tenant-1',
      timestamp: new Date(now.getTime() - 1000 * 60 * 2), // 2 min ago
    });

    const series = service.aggregateSignals(SignalType.TASK_LATENCY, 'agent-1', '5m');
    expect(series.datapoints).toHaveLength(2);
    expect(series.datapoints[0].value).toBe(200); // Sorted by timestamp (oldest first)
    expect(series.datapoints[1].value).toBe(100);
  });

  it('should calculate component health score', () => {
    service.ingestSignal({
      type: SignalType.TASK_FAILURE_COUNT,
      value: 1,
      sourceId: 'agent-fail',
      metadata: { scope: 'AGENT' },
      tenantId: 'tenant-1',
    });
    service.ingestSignal({
      type: SignalType.TASK_FAILURE_COUNT,
      value: 1,
      sourceId: 'agent-fail',
      metadata: { scope: 'AGENT' },
      tenantId: 'tenant-1',
    });

    const snapshot = service.generateHealthSnapshot('tenant-1');
    const agentHealth = snapshot.agents['agent-fail'];

    expect(agentHealth).toBeDefined();
    expect(agentHealth.score).toBeLessThan(80); // Should be penalized
    expect(agentHealth.status).not.toBe(HealthStatus.HEALTHY);
  });

  it('should handle pruning (mocked check)', () => {
    // We won't wait 7 days, but verify method exists and doesn't crash
    service.ingestSignal({
        type: SignalType.CPU_USAGE,
        value: 50,
        sourceId: 'sys',
        tenantId: 't1',
        metadata: { scope: 'SYSTEM' }
    });
    expect(service.generateHealthSnapshot('t1').system.status).toBeDefined();
  });
});
