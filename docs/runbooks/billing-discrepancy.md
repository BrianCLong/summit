# Billing Discrepancy Runbook

## Purpose

Resolve billing discrepancies with policy-based validation and receipt-backed
reconciliation.

## Authority & Policy References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent Mandates: `docs/governance/AGENT_MANDATES.md`
- GA Guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`
- Policy-as-code sources: `policies/`, `policy/`

## Preconditions

- Capture the customer ticket, invoice ID, and billing period.
- Retrieve usage reports and rate tables for the same period.
- Confirm access to billing and receipt services.

## Procedure

1. **Validate the discrepancy** by matching invoice totals to usage records.
2. **Check policy gates** for pricing, discounts, and entitlement rules.
3. **Recompute charges** using approved rate tables and verified usage.
4. **Determine correction** (credit, debit, or confirmation of accuracy).
5. **Notify customer** with evidence-backed summary.

## Receipt & Evidence Capture

- Export billing decision receipts and rate table versions.
- Pull policy decision receipts from `services/receipt-signer`.
- Attach evidence to the case file and update
  `COMPLIANCE_EVIDENCE_INDEX.md`.

## Governed Exceptions

- Any manual adjustment outside policy must be logged as a **Governed
  Exception** with approver and expiration.

## Exit Criteria

- Discrepancy resolved with documented evidence.
- Customer notification sent and recorded.
- Evidence index updated with receipts.
