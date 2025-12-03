import { ActionConsensusEngine } from '../consensus.js';
import { TripletOrchestrator } from '../orchestrator.js';
import { LayerSignal } from '../types.js';

describe('Digital Triplet innovations', () => {
  it('derives fusion signatures and resilience forecasts', () => {
    const orchestrator = new TripletOrchestrator({
      driftDecay: 0.9,
      resilienceDecay: 0.96,
      policy: { driftThreshold: 0.2, resilienceFloor: 0.8 },
      fusionSalt: 'test-fusion',
      safety: { shockThreshold: 10, anomalyWindow: 3 },
    });

    orchestrator.registerTriplet({
      id: 'fusion-1',
      asset: 'satellite',
      controlLoopMs: 100,
      digitalModels: ['sim'],
      agents: ['policy-agent'],
    });

    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'ph1', timestamp: 1, metrics: { torque: 12 } },
      { type: 'digital', modelId: 'sim', timestamp: 2, stateVector: { stability: 0.92 } },
    ];

    const { state } = orchestrator.tick('fusion-1', signals);
    expect(state.fusionSignature).not.toBe('cold-start');
    expect(state.resilienceForecast).toBeGreaterThan(0);
  });

  it('limits actions through consensus budget gating', () => {
    const consensus = new ActionConsensusEngine(0.01);
    const { actions, remainingBudget } = consensus.merge(0.2, [
      { target: 'physical', summary: 'critical act', severity: 'critical' },
      { target: 'physical', summary: 'critical act', severity: 'critical' },
      { target: 'digital', summary: 'warn act', severity: 'warn' },
    ]);

    expect(actions.length).toBe(1);
    expect(remainingBudget).toBeGreaterThan(0);
  });

  it('safety sentinel raises anomaly-driven interventions', () => {
    const orchestrator = new TripletOrchestrator({
      driftDecay: 0.9,
      resilienceDecay: 0.95,
      policy: { driftThreshold: 0.5, resilienceFloor: 0.8 },
      safety: { shockThreshold: 1, anomalyWindow: 2 },
    });

    orchestrator.registerTriplet({
      id: 'anomaly-1',
      asset: 'pipeline',
      controlLoopMs: 100,
      digitalModels: ['d'],
      agents: ['policy-agent'],
    });

    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'p', timestamp: 1, metrics: { surge: 2 } },
    ];

    const { actions } = orchestrator.tick('anomaly-1', signals);
    expect(actions.some((action) => action.summary.includes('Shock dampening'))).toBe(true);
  });

  it('tracks volatility and recalculates health index under signal swings', () => {
    const orchestrator = new TripletOrchestrator({
      driftDecay: 0.85,
      resilienceDecay: 0.94,
      policy: { driftThreshold: 0.25, resilienceFloor: 0.9 },
    });

    orchestrator.registerTriplet({
      id: 'volatility-1',
      asset: 'factory-line',
      controlLoopMs: 150,
      digitalModels: ['sim'],
      agents: ['policy-agent'],
    });

    const burstSignals: LayerSignal[] = [
      { type: 'physical', sourceId: 'p1', timestamp: 1, metrics: { temp: 3, pressure: 9 } },
      { type: 'physical', sourceId: 'p1', timestamp: 2, metrics: { temp: 80, pressure: 1 } },
      { type: 'digital', modelId: 'sim', timestamp: 3, stateVector: { stability: 0.5 } },
    ];

    const { state } = orchestrator.tick('volatility-1', burstSignals);
    expect(state.volatilityScore).toBeGreaterThan(0);
    expect(state.healthIndex).toBeGreaterThan(0);
    expect(state.lastAuditAt).toBeGreaterThan(0);
  });

  it('derives cohesion, entropy, and recovery readiness for turbulent cycles', () => {
    const orchestrator = new TripletOrchestrator({
      driftDecay: 0.9,
      resilienceDecay: 0.9,
      policy: { driftThreshold: 0.2, resilienceFloor: 0.85 },
    });

    orchestrator.registerTriplet({
      id: 'entropy-1',
      asset: 'refinery',
      controlLoopMs: 120,
      digitalModels: ['sim'],
      agents: ['policy-agent'],
    });

    const signals: LayerSignal[] = [
      { type: 'physical', sourceId: 'p', timestamp: 1, metrics: { surge: 33, vibration: 12 } },
      { type: 'digital', modelId: 'sim', timestamp: 2, stateVector: { stability: 0.42, integrity: 0.37 } },
    ];

    const { state, actions } = orchestrator.tick('entropy-1', signals);
    expect(state.cohesionScore).toBeGreaterThan(0);
    expect(state.entropyScore).toBeGreaterThan(0);
    expect(state.recoveryReadiness).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);
  });
});
