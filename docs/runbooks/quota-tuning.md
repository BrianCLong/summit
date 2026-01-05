# Quota Tuning Runbook

## Purpose

Adjust tenant or service quotas while maintaining policy compliance and audit
receipts.

## Authority & Policy References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent Mandates: `docs/governance/AGENT_MANDATES.md`
- GA Guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`
- Policy-as-code sources: `policies/`, `policy/`

## Preconditions

- Identify the quota target (tenant, workspace, API key) and current values.
- Pull recent usage metrics and SLO burn rates.
- Confirm policy limits and approval requirements.

## Procedure

1. **Gather evidence** of the need for tuning (usage spikes, throttling events,
   customer request, or contractual change).
2. **Validate policy constraints** against the policy engine and configured
   limits.
3. **Apply quota changes** through the approved configuration pipeline.
4. **Notify stakeholders** of the new quota values and effective time.
5. **Monitor impact** for error rate, latency, and budget anomalies.

## Receipt & Evidence Capture

- Record the configuration change receipt (diff, approver, timestamp).
- Export policy decision receipts from `server/src/receipts` or
  `services/receipt-signer`.
- Update `COMPLIANCE_EVIDENCE_INDEX.md` and attach evidence to the
  relevant customer record.

## Governed Exceptions

- If a quota exceeds policy defaults, log a **Governed Exception** with
  explicit expiration and approval.

## Exit Criteria

- Quota changes validated with no policy violations.
- Receipts stored and evidence index updated.
- Monitoring confirms stable usage and no new alerts.
