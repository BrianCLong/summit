# Approval & Delegation Framework

This model clarifies who can approve autonomy changes, what requires escalation, and how delegation is recorded and expired.

## 1. Decision Matrix

| Decision Type                    | Examples                                                  | Allowed By                                                  | Escalation                                                | Permanently Disallowed                                           |
| -------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Tier Promotion within guardrails | Tier 1 → Tier 2 for non-customer-facing ops within budget | Domain DRI or on-call lead with valid delegation            | Board-level risk committee if outside budget/SLO envelope | Tier 3 in regulated communications without pre-approved playbook |
| New Autonomy Playbook            | Adding a new autonomous workflow                          | Product owner + Risk/Controls lead; requires policy review  | Governance board if policy exceptions requested           | Playbooks without rollback steps                                 |
| Budget Cap Increase              | Raising cost ceiling for autonomous operations            | Finance lead + Domain DRI; time-bound                       | CFO/Board if above quarterly cap                          | Unlimited or uncapped spend                                      |
| Kill-Switch Activation           | Pausing autonomy in a scope                               | Anyone with safety credential; automated triggers           | Notify CISO + Ops leadership                              | N/A (always permitted)                                           |
| External Communications          | Status pages, customer messaging                          | Comms lead with explicit delegation; tone checker must pass | CEO/Board if crisis-level                                 | Fully autonomous external messaging without approval             |

## 2. Delegation Records

- **Required Fields:** delegatee, delegator, scope (actions/tiers), expiry, evidence required, revocation path.
- **Storage:** Provenance ledger with signed tokens; surfaced in dashboard snapshots.
- **Expiry & Renewal:** Default 30 days; renewal requires review of recent incidents and control effectiveness.

### 2.1 Delegation Record Schema (minimum fields)

- `delegation_id`, `delegator_id`, `delegatee_id`
- `scope` (tiers, playbooks, time window)
- `risk_thresholds` (max risk score, budget cap, SLO envelope)
- `expiry_ts`, `revocation_ts` (if any)
- `evidence_required` (scenario IDs, control plan IDs)
- `signature_hash`

## 3. Approval Workflow

1. **Request:** Initiator submits scope, rationale, and evidence (scenario narrative + control plan).
2. **Validation:** Policy engine checks that the request is within permissible bounds (scope, time, budget, SLO headroom).
3. **Decision:** Approver records decision with signature; auto-enforced by control plane (no manual bypass).
4. **Activation:** Delegation token attached to relevant playbooks; kill-switch remains available regardless of approvals.
5. **Audit:** All approvals logged with immutable hash; surfaced in monthly and quarterly packets.

## 3.1 Approval Evidence Requirements

- Approval request must include **scenario narrative** and **control plan**.
- The decision record must reference **policy version**, **risk thresholds**, and **expiry**.
- Any exception requires a **risk acceptance record** (see taxonomy).

## 4. Review Cadence

- **Weekly:** Expiring delegations report; auto-revocation if not renewed.
- **Monthly:** Board packet includes approvals granted/denied, open requests, and pending expirations.
- **Quarterly:** Governance review of decision matrix; adjust thresholds based on incident learnings.
