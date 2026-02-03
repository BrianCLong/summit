# Agent Health Score & Trajectory Metrics

**Owner:** SRE / Evaluation
**Status:** Live

## 1. Philosophy
Agents are software systems. We measure them using SRE principles, not just "did it answer correctly".

## 2. Core Metrics

### A. Convergence Time
- **Definition:** Wall-clock time from `RUN_START` to `RUN_SUCCEEDED`.
- **Target:** < 5 minutes for Standard Tier tasks.
- **Signal:** High convergence time indicates inefficient planning or model latency.

### B. Oscillation Rate
- **Definition:** Percentage of steps that are repetitions of the previous step (excluding explicit retries).
- **Formula:** `RepeatedSteps / TotalSteps`
- **Signal:** High oscillation (> 0.2) indicates "Loop of Death" or stuck reasoning.

### C. Recovery Rate
- **Definition:** Probability of a run succeeding after encountering at least one tool/step failure.
- **Target:** > 0.9
- **Signal:** Measures resilience. An agent that dies on the first API error is fragile.

### D. Escalation Density
- **Definition:** Frequency of Human-in-the-Loop requests per trajectory.
- **Formula:** `Escalations / TotalSteps`
- **Target:** < 0.05 (1 in 20 steps)
- **Signal:** Measures autonomy. High density means the agent is just a fancy UI for a human.

## 3. The "Agent System Health" Score
A normalized 0.0 - 1.0 score calculated per run:

```typescript
Score = Base(1.0)
      - (OscillationRate * 0.5)
      - (EscalationDensity * 0.3)
      * RecoveryFactor
```

This score is logged to the Provenance Ledger and used for `verify_release_constraints`.
