**Objective**: Gradual rollout with auto-rollback triggers.
- Steps: 5% → 25% → 50% → 100%
- Golden signals: p95 latency, error rate, saturation.
- Rollback if any exceed thresholds for 5 minutes.