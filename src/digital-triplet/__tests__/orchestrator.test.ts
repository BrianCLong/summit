import { TripletOrchestrator } from '../orchestrator.js';
import { LayerSignal } from '../types.js';

describe('TripletOrchestrator', () => {
  const orchestrator = new TripletOrchestrator({
    driftDecay: 0.9,
    resilienceDecay: 0.95,
    policy: { driftThreshold: 0.3, resilienceFloor: 0.8 },
  });

  orchestrator.registerTriplet({
    id: 't1',
    asset: 'microgrid',
    controlLoopMs: 250,
    digitalModels: ['sim-1'],
    agents: ['policy-agent'],
  });

  it('fuses multi-layer signals and adjusts drift/resilience', () => {
    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'sensor-1', timestamp: 1, metrics: { voltage: 1.1, current: 0.4 } },
      { type: 'digital', modelId: 'sim-1', timestamp: 2, stateVector: { stability: 0.96 } },
    ];

    const { state, actions } = orchestrator.tick('t1', signals);

    expect(state.lastPhysical?.metrics.voltage).toBeCloseTo(1.1);
    expect(state.lastDigital?.stateVector.stability).toBeCloseTo(0.96);
    expect(state.driftScore).toBeGreaterThan(0);
    expect(state.resilienceScore).toBeGreaterThan(0.8);
    expect(state.volatilityScore).toBeGreaterThanOrEqual(0);
    expect(state.healthIndex).toBeGreaterThan(0);
    expect(state.cohesionScore).toBeGreaterThan(0);
    expect(state.entropyScore).toBeGreaterThanOrEqual(0);
    expect(state.recoveryReadiness).toBeGreaterThan(0);
    expect(state.provenanceHash).toBeTruthy();
    expect(state.antifragilityIndex).toBeGreaterThan(0);
    expect(state.assuranceScore).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThanOrEqual(0);
  });

  it('emits corrective actions when drift exceeds threshold', () => {
    const driftSignal: LayerSignal = {
      type: 'physical',
      sourceId: 'sensor-2',
      timestamp: 3,
      metrics: { deviation: 80 },
    };

    const { actions } = orchestrator.tick('t1', [driftSignal]);
    expect(actions.some((action) => action.target === 'digital')).toBe(true);
  });

  it('prepares recovery actions when cohesion collapses', () => {
    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'sensor-3', timestamp: 4, metrics: { load: 120, shock: 95 } },
      { type: 'digital', modelId: 'sim-1', timestamp: 5, stateVector: { stability: 0.3 } },
    ];

    const { actions, state } = orchestrator.tick('t1', signals);
    expect(state.cohesionScore).toBeLessThan(0.7);
    expect(actions.some((action) => action.summary.includes('graceful degradation'))).toBe(true);
  });

  it('detects adversarial divergence and emits quarantine controls', () => {
    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'sensor-4', timestamp: 6, metrics: { load: 300, surge: 210 } },
      { type: 'digital', modelId: 'sim-1', timestamp: 7, stateVector: { stability: 0.1, surge: 0.05 } },
      {
        type: 'cognitive',
        agentId: 'agent-low-trust',
        timestamp: 8,
        intent: 'override',
        recommendations: ['force apply'],
        confidence: 0.1,
      },
    ];

    const { actions, state } = orchestrator.tick('t1', signals);
    expect(state.adversarialFindings).toBeGreaterThan(0);
    expect(state.provenanceHash).toBeTruthy();
    expect(actions.some((action) => action.summary.toLowerCase().includes('quarantine'))).toBe(true);
  });
});
