import { TripletRuntime } from '../runtime.js';
import { InMemoryMetricsSink } from '../metrics.js';
import { InMemoryTripletPersister } from '../persisters/memory.js';
import { LayerSignal } from '../types.js';

const buildRuntime = () => {
  const metrics = new InMemoryMetricsSink();
  const persister = new InMemoryTripletPersister();
  const runtime = new TripletRuntime({
    orchestratorOptions: {
      driftDecay: 0.9,
      resilienceDecay: 0.95,
      policy: { driftThreshold: 0.4, resilienceFloor: 0.85 },
    },
    metricsSink: metrics,
    persister,
  });
  return { runtime, metrics, persister };
};

describe('TripletRuntime', () => {
  it('persists snapshots and emits metrics on ingest', async () => {
    const { runtime, metrics, persister } = buildRuntime();
    await runtime.register({
      id: 'rt1',
      asset: 'battery-array',
      controlLoopMs: 200,
      digitalModels: ['sim-a'],
      agents: ['policy-agent'],
    });

    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'sensor-a', timestamp: Date.now(), metrics: { temp: 32 } },
      { type: 'digital', modelId: 'sim-a', timestamp: Date.now(), stateVector: { health: 0.91 } },
    ];

    const snapshot = await runtime.ingest('rt1', signals);
    expect(snapshot.state.lastPhysical?.metrics.temp).toBe(32);
    expect(snapshot.state.lastDigital?.stateVector.health).toBeCloseTo(0.91);
    expect(snapshot.state.cohesionScore).toBeGreaterThan(0);
    expect(snapshot.state.entropyScore).toBeGreaterThanOrEqual(0);
    expect(snapshot.state.recoveryReadiness).toBeGreaterThan(0);

    const stored = await persister.load('rt1');
    expect(stored?.id).toBe('rt1');
    expect(metrics.getAll().length).toBeGreaterThanOrEqual(3);
  });

  it('can start and stop the control loop', async () => {
    jest.useFakeTimers();
    const { runtime } = buildRuntime();
    await runtime.register({
      id: 'loop-1',
      asset: 'microgrid',
      controlLoopMs: 100,
      digitalModels: ['sim-loop'],
      agents: ['policy-agent'],
    });

    const handle = runtime.beginControlLoop('loop-1', 50);
    expect(handle.intervalMs).toBe(50);

    jest.advanceTimersByTime(120);
    runtime.stopControlLoop('loop-1');
    jest.useRealTimers();
  });
});
