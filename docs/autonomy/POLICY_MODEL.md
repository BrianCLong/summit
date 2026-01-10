# Autonomy Policy Model

This document describes the policy controls that map autonomy tiers to allowed actions, budget ceilings, and confidence thresholds. Policies are expected to be implemented in OPA/Rego (or equivalent), fail closed on missing data, and emit evidence suitable for provenance and receipts.

## Policy-as-Code Requirements

- All regulatory or compliance logic must be expressed as policy-as-code; no out-of-band overrides.
- Decisions that require compliance or ethics review must emit a decision log entry with rationale and reviewer identifiers.
- Policy evaluation must include immutable inputs (scope, tenant, budget caps, rollback URI) and produce an audit-ready decision record.

## Decision Inputs

- Requested tier and loop identifier
- Declared resource scope and tenant
- Budget ceilings (per action, per window)
- Confidence score and supporting signals
- Action token (Tier 1) or enablement artifact (Tier 3)
- Rollback URI and reversibility check result
- Rate-limit profile

## Decision Outputs

- `allow` or `deny`
- Effective tier (after policy evaluation)
- Action bounds (parameters, rate limits, budget ceilings)
- Required rollback plan reference
- Evidence requirements for the receipt (signals, confidence, verifier)
- Decision log pointer for compliance or ethics review (when applicable)

## Tier → Allowed Actions Mapping

- **Tier 0:** Recommend-only; deny any mutation requests.
- **Tier 1:** Allow only actions explicitly listed in the approval token; require post-action verification evidence before closing.
- **Tier 2:** Allow bounded optimizations (parameter tuning, cache/batch/retry adjustments) within declared scope; deny schema/policy/tenant changes.
- **Tier 3:** Allow conditional secondary actions only when guard conditions are satisfied and executive enablement is present; enforce stricter budgets and rollback windows than Tier 2.

## Confidence & Budget Thresholds

- Each tier sets **minimum confidence**; Tier 2 and Tier 3 require higher thresholds and multiple independent signals for Tier 3.
- **Cost ceilings**: Per-action and per-window budgets must be present; missing ceilings → `deny`.
- **Rate limits**: Tier 2 and 3 actions must attach rate-limit profiles; missing limits → `deny`.

## Fail-Closed Defaults

- Unknown or missing tier → `deny`
- Missing rollback URI or reversibility check → `deny`
- Missing approval token (Tier 1) or enablement artifact (Tier 3) → `deny`
- Scope expansion beyond declared resources → `deny`
- Missing provenance ID or receipt configuration → `deny`

## Example Rego Sketch

```rego
package autonomy.tiers

import future.keywords.if

default allow := false

# Deny if tier unknown or evidence missing
allow if {
  input.tier != ""
  input.provenance_id != ""
  has_required_evidence[input.tier]
  tier_rules[input.tier]
}

tier_rules["tier1"] if {
  input.approval_token.valid
  input.scope == input.approval_token.scope
  input.budget <= input.approval_token.budget_cap
}

tier_rules["tier2"] if {
  input.reversible
  not input.mutates_policy
  not input.cross_tenant
  input.rate_limit.enforced
  input.budget <= input.budget_cap
}

has_required_evidence[tier] if {
  input.rollback_uri != ""
  input.confidence >= confidence_threshold[tier]
  input.cost_caps_present
}
```

## Testing Expectations

- Unit tests must verify deny on missing inputs and allow only when all caps, scopes, and artifacts are present.
- Policy simulations must exist for representative loops at Tier 0, 1, and 2.
- Regression tests must assert auto-demotion triggers when confidence or budget thresholds fail.
