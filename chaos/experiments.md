# Chaos Experiments

## Playbook
1. **Pod kill**: randomly terminate API pods (max 20% at once) during active load; verify traffic shifts and SLOs hold.
2. **Broker kill**: stop one Kafka/Redpanda broker; ensure producer retries and consumer lag recovers; audit pipeline continuity checked.
3. **Policy bundle rollback**: deploy invalid policy bundle; ensure deny-by-default and appeal path remain available; rollback via canary.
4. **Cache eviction**: flush caches to test warm-up latency and cost guard responsiveness.

## Rollback & Verification
- Health checks must return green within 5 minutes; otherwise rollback deployment via automation.
- Verify audit hash-chain continuity and ledger checkpoints after each experiment.
- Confirm SLO dashboards and burn-rate alerts triggered appropriately and were acknowledged.
- Capture report: scenario, blast radius, recovery time, anomalies, follow-up actions.

## Guardrails
- Change ticket required before execution; on-call approval recorded.
- Experiments run in staging with synthetic data unless explicitly waived.
- Disable any connector touching live PII; enforce policy-by-default gating throughout.
