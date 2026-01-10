# Autonomy Promotion & Demotion Mechanics

This guide defines the rules for promoting and demoting optimization loops across autonomy tiers. Promotions are explicit, evidence-backed, and policy-controlled. Demotions are automatic on regression, budget overrun, or confidence degradation.

## Promotion Rules

- **Baseline:** All loops start at Tier 0 (Advisory).
- **Stability duration:**
  - Tier 0 → Tier 1: Minimum 3 successful recommendations with matching post-action outcomes after human execution.
  - Tier 1 → Tier 2: Minimum 7 consecutive successful executions within approved bounds and budgets.
- **Accuracy & benefit thresholds:**
  - Accuracy ≥ target defined per loop; benefit must be positive and within budget.
  - Confidence scores must meet tier minimums (Tier 2 higher than Tier 1); Tier 3 requires multiple independent signals.
- **Human approval requirements:**
  - Tier 0 → Tier 1: Owner approval with scoped action token.
  - Tier 1 → Tier 2: Owner + policy lead approval with evidence of reversibility tests.
  - Tier 2 → Tier 3: Executive enablement artifact plus independent signal verification.
- **Evidence capture:**
  - Receipts for each evaluation, rollback test artifacts, cost/benefit summaries, and drift checks stored in provenance ledger.
- **Policy gate:** Promotion requests pass through the policy engine; missing evidence or approvals → deny.
- **Compliance log:** Promotions that trigger compliance or ethics review must include the decision log reference in the promotion receipt.

## Auto-Demotion Triggers

- **Regression detected:** Expected vs. actual deviation crosses tolerance or drift detector flags anomaly.
- **Budget overrun:** Per-action or window budget exceeds cap or cost-guard missing.
- **Confidence degradation:** Confidence or signal quality drops below tier minimums or signals disagree.
- **Scope violation:** Attempted scope expansion or cross-tenant access.
- **Missing evidence:** Receipts, rollback paths, or provenance IDs absent for any action.

## Promotion Workflow

1. **Request:** Loop owner submits promotion request with evidence bundle (receipts, rollbacks, metrics) and target tier.
2. **Policy evaluation:** OPA policy checks preconditions, approvals, budgets, and evidence completeness.
3. **Stability verification:** Automated checks confirm required successful runs and drift thresholds.
4. **Human approval:** Required approvers sign off (per tier rules) and attach approval identifiers to the request.
5. **Activation:** Executor updates the loop’s effective tier; receipts must capture the promotion event and new caps.
6. **Monitoring:** Elevated alerting for the first N actions after promotion (configurable, default 10) with auto-demotion enabled.

## Demotion Workflow

1. **Trigger:** Any auto-demotion condition fires or a human issues a downgrade command.
2. **Immediate effect:** Executor stops pending actions and re-evaluates at the downgraded tier (typically Tier 0 for human override).
3. **Rollback:** If actions were in-flight, invoke rollback path and record outcomes.
4. **Notification:** Emit alerts and receipts documenting trigger, tier change, and remediation steps.
5. **Re-evaluation:** Promotion can be reconsidered only after stability criteria are re-established and evidence gaps are closed.

## Evidence & Audit Expectations

- Every promotion/demotion event must emit a receipt with: prior tier, new tier, trigger, approvals, evidence bundle references, and rollback readiness.
- All metrics, logs, and traces must be tagged with the effective tier and promotion state to allow instant operator answers to “what tier is this running at, and why?”.
