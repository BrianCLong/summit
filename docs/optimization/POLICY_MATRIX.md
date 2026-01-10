# Policy Matrix for Optimization Loops

Each loop must have explicit allow/deny policies, scoped budgets, and fail-closed defaults. Policies are enforced via the policy engine with OPA-style rules.

## Per-Loop Policy Table

| Loop ID | Class | Allowed Actions                                                         | Denied Actions                                                | Impact Scope                         | Enabling Authority        | Fail-Closed Conditions                                                        |
| ------- | ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------- |
| L-A1    | A     | Prompt template swap, compaction toggle, truncation rule enable/disable | Any change outside prompt registry; cross-tenant prompt edits | Copilot prompt configs only          | Platform Eng + Governance | Missing semantic regression signals, absent token metrics, budget exhaustion  |
| L-B1    | B     | Retry count/backoff/jitter adjustments within bounds                    | Changing circuit breaker thresholds; altering auth timeouts   | Per-service retry policy             | SRE Lead + Governance     | Missing SLO burn data, missing error histograms, active incident flag         |
| L-C1    | C     | Concurrency window +/-25%, lane partition shift                         | Disabling backpressure, bypassing rate limits                 | Worker pools/API handlers per tenant | SRE Lead + Platform Eng   | Queue metrics unavailable, SLO burn >50%, resource saturation signals missing |
| L-D1    | D     | Emit least-privilege recommendations, flag risky scopes                 | Direct policy writes, token revocation                        | Policy definitions in advisory mode  | Security Architect        | Missing policy graph diff, incomplete access logs                             |

## Per-Loop Budget Rules

- **Cost per execution:**
  - L-A1: ≤ $0.05 per evaluation batch (token analytics compute).
  - L-B1: ≤ $0.10 per policy adjustment (telemetry and validation cost).
  - L-C1: ≤ $0.08 per tuning attempt (load testing window capped at 5 minutes).
  - L-D1: ≤ $0.02 per advisory scan.
- **Max executions per interval:**
  - L-A1: 4 per 24h.
  - L-B1: 2 per 24h per service.
  - L-C1: 2 per 24h per service.
  - L-D1: 1 per 24h.
- **Global ceiling:**
  - Combined loop spend capped at $150/month and 30 actions/month; exhaustion forces fail-closed until reset by governance.

## Fail-Closed Defaults

- Any missing required signal immediately blocks execution and emits a receipt indicating the failed precondition.
- Unknown loop IDs, absent policy bindings, or expired approvals result in deny-by-default.
- Budget overruns automatically revoke execution tokens until human approval re-authorizes the loop.
- Cross-loop conflicts require human arbitration; no automatic retries are permitted.

## OPA Rule Pointers

- `package policy.optimization.authz`: binds loop IDs to allowed actions and scopes.
- `package policy.optimization.budget`: enforces per-loop and global ceilings.
- `package policy.optimization.fail_closed`: returns deny when preconditions are not met or signals are missing.

## OPA Input Contract (Required Fields)

```json
{
  "loop_id": "L-A1",
  "action": "prompt_compaction",
  "mode": "advisory",
  "scope": { "allowed": true, "resource": "prompt-registry" },
  "approvals": { "valid": true, "authority": ["governance", "platform-eng"] },
  "signals": { "token_delta": -0.12, "success_rate": 0.991 },
  "required_signals": ["token_delta", "success_rate"],
  "budget": {
    "available": 1.0,
    "loop_remaining": 2,
    "global_remaining": 10
  },
  "cost": 0.05,
  "timestamp": "2025-12-31T23:59:00Z"
}
```

- Policy evaluation must fail-closed if any required field is missing or invalid.
- Approvals and scope gating are required for active actions; advisory mode still requires recorded authorization.
