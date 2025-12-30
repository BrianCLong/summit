# Sandbox Execution Profile

## Environment Controls

- CPU and memory quotas with timeouts to prevent runaway jobs.
- Optional trusted execution environment (TEE) attestation for integrity.
- Network egress restricted except for policy-approved export channels.

## Execution Steps

1. Load dataset snapshot referenced by determinism token.
2. Execute analytic operation (SQL, graph, or custom job) under resource constraints.
3. Capture execution trace for audit; store trace root in witness ledger under proof budget.
4. Apply disclosure transforms and compute info-loss metrics.

## Failure Handling

- Reject execution if policy denies export or attestation fails.
- Abort and log if resource limits are exceeded; emit denial artifact with policy decision ID.
