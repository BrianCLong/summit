# Tiered Receipts & Explainability

Every autonomy action must emit a receipt into the provenance ledger. Receipts provide a complete, auditable record of the tier, decision rationale, and rollback readiness at the moment of action.

## Receipt Schema (Logical)

```json
{
  "receipt_id": "uuid",
  "timestamp": "2025-12-31T00:00:00Z",
  "loop_id": "loop-123",
  "requested_tier": "tier2",
  "effective_tier": "tier2",
  "mode": "execute | replay | simulate",
  "action": {
    "name": "cache_ttl_adjust",
    "digest": "sha256:...",
    "scope": ["service:graph", "tenant:acme"],
    "parameters": { "ttl_ms": 60000 }
  },
  "policy": {
    "decision": "allow",
    "policy_version": "opa-policy@2025-12-31",
    "decision_id": "decision-abc",
    "decision_log_ref": "prov://decision/log/123"
  },
  "signals": {
    "confidence": 0.92,
    "sources": ["metrics", "alerts", "simulation"],
    "threshold": 0.9
  },
  "budget": {
    "action_cap": 50.0,
    "window_cap": 200.0,
    "currency": "USD"
  },
  "rate_limit": { "profile": "tier2-default", "enforced": true },
  "verification": {
    "pre_check": "passed",
    "post_check": "passed",
    "verifier": "health-check@v2"
  },
  "rollback": {
    "uri": "prov://rollback/plan/456",
    "window_minutes": 30,
    "status": "ready"
  },
  "approvals": {
    "approval_token": "token-xyz",
    "executive_enablement": "enablement-789"
  },
  "outcome": {
    "expected": "cache hit rate +5%",
    "actual": "cache hit rate +4.2%",
    "drift": 0.8
  }
}
```

## Receipt Requirements by Tier

- **Tier 0**: Receipts are required for simulations and recommendations (`mode: simulate`).
- **Tier 1**: Receipts must include approval token ID, post-action verification, and rollback readiness.
- **Tier 2**: Receipts must include bounds, rate-limit profile, and expected vs. actual outcomes.
- **Tier 3**: Receipts must include executive enablement artifact and independent signal attestations.

## Explainability & Operator Queries

Receipts must allow operators to answer:

- What tier was in effect and why?
- Which signals and thresholds were used?
- Which caps, scopes, and rollback windows were enforced?

## Storage & Retention

- Receipts are immutable append-only records in the provenance ledger.
- Retain receipts per compliance policy; deletions are prohibited.
- Compliance-triggered decisions must link to decision logs.
