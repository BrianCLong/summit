# Autonomy Tiers (Contracts)

This document defines the enforced autonomy tiers for optimization loops. Each tier includes preconditions, allowed actions, hard caps, rollback guarantees, and required evidence to make the current autonomy level auditable and reversible. Execution and receipt behavior are detailed in `EXECUTION.md` and `RECEIPTS.md`.

## Tier Overview

| Tier                                                                 | Operating Mode                         | Preconditions                                                                                  | Allowed Actions                                                                                | Hard Caps                                                                                               | Rollback & Evidence                                                                      |
| -------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Tier 0 — Advisory (Default)**                                      | Recommend-only                         | Loop registered with provenance ID; simulations attached to recommendation                     | Generate recommendations, impact estimates, what-if simulations                                | No writes; cost-estimation only                                                                         | Human review record required for any downstream action                                   |
| **Tier 1 — Human-in-the-Loop Execution**                             | Execute after explicit approval        | Valid approval token (single-use, TTL-bound); change scoped to declared surface                | Execute pre-approved changes; one action per token; mandatory post-action verification         | Token scope cannot exceed declared resources; budget <= pre-approved cap                                | Post-action receipt with verifier evidence and rollback URI                              |
| **Tier 2 — Bounded Autonomous Execution**                            | Auto-execute within strict envelopes   | Policy check returns `allow` with bounded plan; reversible actions only; rate-limit configured | Parameter tuning within bounds; cache/batch/retry adjustments; budget-preserving optimizations | No scope expansion; no cross-tenant operations; no schema/policy mutation; rate-limit defaults enforced | Automatic receipt emission, rollback plan pre-validated, rollback window < SLO threshold |
| **Tier 3 — Conditional Autonomy (Exceptional, Disabled by Default)** | Secondary actions when conditions hold | Executive enablement artifact; multiple independent signals; elevated confidence threshold     | Conditional secondary actions chained to primary event                                         | Same as Tier 2 plus tighter budget/time caps; short rollback window                                     | Dual-signature receipt with risk acceptance and auto-downgrade timer                     |

## Contracts by Tier

### Tier 0 — Advisory

- **Decision rights:** Human only.
- **Execution:** None; outputs are recommendations with impact estimates.
- **Evidence:** Simulation or what-if trace attached to each recommendation.
- **Rollback:** Not applicable (no changes executed).

### Tier 1 — Human-in-the-Loop Execution

- **Decision rights:** Human approves each action via approval token (single use, TTL-bound, scoped).
- **Execution:** Only actions explicitly described in the approval token payload. Each action consumes a single token; token TTL must be active at evaluation time.
- **Evidence:** Pre- and post-execution checks recorded; verification status must be `passed` before closing the token.
- **Rollback:** Reversible action or prepared rollback plan stored with the token; rollback instructions referenced in the receipt.

### Tier 2 — Bounded Autonomous Execution

- **Decision rights:** Policy engine grants permission; no implicit promotion from Tier 0/1.
- **Execution:** Automated adjustments constrained by:
  - **Parameters:** Only within declared bounds per policy.
  - **Safety:** No schema, policy, or cross-tenant mutations.
  - **Rate limits:** Default conservative rate; overrides require policy approval.
- **Evidence:** Receipts must include tier, signals, confidence, expected vs. actual outcome, action token, and rollback references.
- **Rollback:** Pre-validated rollback path with maximum rollback-time budget; auto-trigger on regression or budget breach.

### Tier 3 — Conditional Autonomy (Disabled by Default)

- **Decision rights:** Explicit executive enablement artifact plus policy approval; requires multi-signal confirmation.
- **Execution:** Conditional secondary actions only when guard conditions hold; always paired with Tier 2 envelopes.
- **Evidence:** Dual-signature receipts (executor + executive enablement) and compressed rollback window.
- **Rollback:** Mandatory auto-downgrade timer and immediate rollback on signal disagreement.

## Promotion and Demotion Boundaries

- No tier can be assumed; **default is Tier 0**.
- Promotion requires satisfaction of criteria defined in `PROMOTION_FLOW.md` and recorded evidence.
- Demotion is automatic on policy denial, regression detection, budget overrun, confidence degradation, or missing evidence.
- Manual human override to Tier 0 is always allowed and must be honored immediately.

## Enforcement Signals

- **Policy engine** supplies `allow/deny` plus decision reason and effective tier.
- **Evidence hooks** emit receipts to the provenance ledger with tier, action token, confidence, expected vs. actual, and rollback URI.
- **Cost guardrails** cap spend per action and per window; any missing cap results in `deny`.
- **Fail-closed defaults:** Unknown tier, missing token, missing evidence, or missing rollback path → deny.
