# Digital Triplet Runtime Implementation

This runtime turns the Digital Triplet specification into executable code. It packages a lightweight orchestration core, policy agent, and registry so operators can stream physical signals, synchronize digital simulators, and keep cognitive agents aligned.

## Modules

- **`src/digital-triplet/types.ts`** — canonical signal, state, snapshot, metrics, and persistence contracts across the physical, digital, and cognitive layers plus fusion signatures, resilience forecasts, and intent budgets.
- **`src/digital-triplet/registry.ts`** — authoritative registry for triplet definitions and mutable lifecycle state with optimistic updates.
- **`src/digital-triplet/agents/policy.ts`** — guardrail agent that evaluates drift and resilience posture, emitting feedback actions for all layers.
- **`src/digital-triplet/agents/safety.ts`** — anomaly sentinel that isolates shocks, reconciles simulators, and escalates to cognitive review.
- **`src/digital-triplet/fusion.ts`** — holographic fusion engine producing alignment tokens for every state transition.
- **`src/digital-triplet/forecaster.ts`** — micro-trend forecaster that projects short-horizon resilience trajectories.
- **`src/digital-triplet/volatility.ts`** — dispersion scanner that quantifies cross-layer volatility for every tick.
- **`src/digital-triplet/stability.ts`** — composite stability/health analyzer that blends drift, resilience, budgets, and volatility.
- **`src/digital-triplet/consensus.ts`** — budgeted consensus kernel that deduplicates actions and enforces intentionality budgets.
- **`src/digital-triplet/cohesion.ts`** — cross-layer cohesion engine that measures alignment between physical, digital, and cognitive anchors.
- **`src/digital-triplet/entropy.ts`** — entropy calibrator that normalizes unpredictability across magnitudes and smooths over recent history.
- **`src/digital-triplet/recovery.ts`** — recovery planner that crafts graceful-degradation actions when cohesion, entropy, or health diverge.
- **`src/digital-triplet/adversarial.ts`** — divergence sentinel that detects contested or adversarial signals and issues quarantine/recalibration controls.
- **`src/digital-triplet/attestation.ts`** — provenance attestor that chains fusion signatures, signals, and resilience posture into verifiable hashes with assurance scoring.
- **`src/digital-triplet/antifragility.ts`** — antifragility scorer that quantifies benefit-from-stress based on resilience forecast, cohesion, recovery readiness, and intent budget.
- **`src/digital-triplet/orchestrator.ts`** — deterministic control loop that fuses signals, decays drift/resilience, triggers policy decisions, and emits metrics.
- **`src/digital-triplet/runtime.ts`** — production-facing runtime that couples orchestrator, persistence, metrics, and control loop scheduling.
- **`src/digital-triplet/metrics.ts`** — pluggable metrics sinks (in-memory + noop) for observability without a backend dependency.
- **`src/digital-triplet/persisters/memory.ts`** — in-memory persistence adapter capturing authoritative state for replay/recovery.
- **`src/digital-triplet/__tests__/orchestrator.test.ts`** — contract tests for fusion, drift decay, resilience growth, and policy activation.
- **`src/digital-triplet/__tests__/runtime.test.ts`** — runtime contract tests for persistence, metrics, and control loop scheduling.
- **`src/digital-triplet/__tests__/innovation.test.ts`** — innovation tests for fusion signatures, consensus gating, and anomaly interventions.

## Usage

```ts
import { TripletRuntime } from '../src/digital-triplet';

const runtime = new TripletRuntime({
  orchestratorOptions: {
    driftDecay: 0.92,
    resilienceDecay: 0.96,
    policy: { driftThreshold: 0.4, resilienceFloor: 0.85 },
  },
});

await runtime.register({
  id: 'grid-01',
  asset: 'microgrid',
  controlLoopMs: 500,
  digitalModels: ['grid-sim'],
  agents: ['policy-agent'],
});

const snapshot = await runtime.ingest('grid-01', [
  { type: 'physical', sourceId: 'ph1', timestamp: Date.now(), metrics: { voltage: 1.02 } },
  { type: 'digital', modelId: 'grid-sim', timestamp: Date.now(), stateVector: { stability: 0.97 } },
]);

console.log(snapshot.state, snapshot.definition);
```

## Operational Notes

- Drift is decayed each cycle and nudged by the absolute deviation of incoming metrics.
- Resilience grows with simulator freshness and cognitive confidence, then decays softly to avoid runaway values.
- Fusion signatures and resilience forecasts are recalculated every tick to keep cognitive alignment tokens fresh.
- Safety sentinel outputs anomaly-driven actions; a consensus kernel enforces budgets before emitting feedback.
- Cohesion/entropy analytics stream alignment and uncertainty into recovery planning so degraded cycles get auto-guarded.
- Every tick records volatility and a health index into state + metrics so operators can automate regressions and watchdogs.
- Adversarial scanning compares physical/digital payloads and low-trust intents; quarantine + recalibration actions are budgeted alongside safety interventions.
- Provenance attestation emits a chained hash + assurance score each tick so downstream consumers can verify lineage without replaying raw signals.
- Antifragility scoring quantifies benefit-from-stress to prioritize upgrades and graceful-degradation playbooks that harden the system under turbulence.
- Policy actions target physical, digital, or cognitive layers depending on drift and resilience posture.
- Control loop heartbeats emit metrics (`control-loop-heartbeat`) to prove schedulers are alive.
- In-memory persistence can be swapped for durable stores by implementing the `TripletPersister` contract.
