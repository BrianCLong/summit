# Runbook: Switchboard OPA Latency Spike

## Trigger
- Policy evaluation p95 exceeds 100ms.
- Alert: `SwitchboardPolicyEvalLatencyHigh`.

## Impact
Command execution preflight delays; approvals backlog increases.

## Triage Steps
1. Check OPA pod CPU/memory saturation.
2. Inspect bundle download times and policy size.
3. Validate cache hit rates for policy evaluation.

## Mitigations
- Scale OPA instances.
- Reduce bundle size or remove unused rules.
- Enable policy cache warmup for high-volume tenants.

## Verification
- Policy eval p95 returns below 100ms.
- Command execute latency p95 below 1.5s.
