# Autonomy Invariants

These invariants hold at every autonomy tier. They define the non-negotiable safety, governance, and audit guarantees that cannot be overridden by configuration or tier promotion.

## Hard Invariants

- **Policy-first enforcement:** All execution decisions must pass through the policy engine; no bypass or cached approvals are allowed.
- **Fail-closed defaults:** Unknown tier, missing evidence, missing rollback, or missing budget caps immediately result in `deny`.
- **Human override supremacy:** A human operator can force downgrade to Tier 0 at any time; downgrade must take effect before the next action is evaluated.
- **Provenance and receipts:** Every action (including simulations at Tier 0) must emit a receipt with tier, signals, confidence, action token, and rollback reference into the provenance ledger.
- **Compliance decision logging:** Any policy decision that triggers compliance or ethics review must be logged with decision rationale, reviewers, and evidence pointers.
- **Budget and blast-radius caps:** Per-action and per-window budget ceilings, rate limits, and scope boundaries must be enforced by the executor and validated by policy before each action.
- **Reversibility requirement:** No autonomous action may execute without a verified rollback path and time-bounded rollback window; irreversible changes are disallowed at all tiers.
- **Tenant and policy isolation:** No cross-tenant or policy mutations are permitted from autonomous flows; policy changes require separate human governance paths.
- **Evidence-backed promotions:** Promotion between tiers must include evidence artifacts that satisfy `PROMOTION_FLOW.md`; no implicit promotions are allowed.
- **Observation and alerting:** Telemetry (metrics, logs, traces) must include tier labels, decision reasons, and rollback outcomes; alerts trigger on policy denies, budget overruns, rollback invocation, or auto-demotions.
- **Drift detection:** Actual outcomes must be compared to expected outcomes; regressions trigger rollback and auto-demotion.

## Immutable Inputs to Policy Decisions

- Requested tier and invoking loop ID
- Declared resource scope and tenant
- Budget ceilings (per action and window)
- Confidence estimates and signal sources
- Rollback URI and reversibility checks
- Approval token (Tier 1) or enablement artifact (Tier 3)

## Non-Goals (Enforced by Invariants)

- No self-promotion of tiers
- No long-lived or reusable approval tokens
- No execution when provenance IDs or cost caps are missing
- No deviation from declared scopes during runtime
