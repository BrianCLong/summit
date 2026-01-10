# Tier-Aware Execution

This document defines how the execution engine enforces autonomy tiers at runtime. The executor is policy-driven, fail-closed, and must emit tier-scoped receipts for every action, including Tier 0 simulations.

## Execution Pipeline

1. **Ingress**: Action request arrives with loop ID, requested tier, declared scope, budget caps, and rollback URI.
2. **Policy evaluation**: Policy engine returns `allow`/`deny`, effective tier, and execution bounds.
3. **Bounds enforcement**: Executor validates parameter envelopes, scope, tenant isolation, rate limits, and budget caps.
4. **Token verification**:
   - Tier 1: Validate approval token signature, TTL, scope, and single-use status.
   - Tier 3: Validate executive enablement artifact and secondary-signal attestation.
5. **Execution**: Perform the action only if all guards pass; otherwise fail closed.
6. **Verification**: Mandatory post-action verification for Tier 1 and higher.
7. **Receipt emission**: Emit a tiered receipt to provenance ledger (see `RECEIPTS.md`).
8. **Rollback readiness**: Validate rollback plan and timer window; trigger rollback on regression or breach.

## Executor Invariants

- Policy evaluation occurs immediately before execution; cached approvals are forbidden.
- Missing evidence, missing rollback, or missing caps result in `deny`.
- Human override to Tier 0 takes effect before the next action evaluation.

## Action Tokenization

All actions must be tokenized to ensure scoped, time-bounded execution.

- **Token fields**: `token_id`, `loop_id`, `scope`, `tier`, `ttl`, `budget_cap`, `action_digest`, `issued_by`.
- **Single-use**: Tokens are consumed on success or failure and cannot be reused.
- **TTL enforcement**: Tokens expire at evaluation time; expired tokens trigger `deny`.
- **Scope binding**: Action must match `action_digest` and declared scope.

## Replay Mode (No-Act)

The executor supports a replay path that re-evaluates an action through policy, bounds, and receipt generation without performing side effects.

- **Inputs**: Original action request + snapshot of required signals.
- **Outputs**: Simulated `allow`/`deny`, effective tier, and receipt with `mode: replay`.
- **Purpose**: Operator explanation, regression analysis, and post-incident review.

## Rollback Guarantees

- **Pre-validated rollback**: Rollback plan must be validated prior to execution.
- **Rollback window**: Tier 2+ must enforce a rollback time window; Tier 3 requires a shorter window.
- **Auto-demotion**: Any rollback invocation demotes the loop to Tier 0 unless explicitly overridden by policy.

## Evidence Flow

Receipts and decision logs are appended to the provenance ledger with tier labels, decision rationale, and links to verification artifacts. Compliance-triggered decisions must include a decision log pointer.
