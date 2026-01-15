# Purge Runbook

## Purpose

Purge data according to retention policy, ensuring immutable receipts and
compliance evidence are captured.

## Authority & Policy References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`
- Agent Mandates: `docs/governance/AGENT_MANDATES.md`
- GA Guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`
- Policy-as-code sources: `policies/`, `policy/`
- Retention evidence: `COMPLIANCE_EVIDENCE_INDEX.md`

## Preconditions

- Identify data scope, retention window, and legal holds.
- Confirm purge approval and policy requirements.
- Validate backups for the purge scope are current.

## Procedure

1. **Confirm scope** (tenant, dataset, time window) against retention policy.
2. **Execute purge** via approved data lifecycle tooling.
3. **Verify removal** by sampling target datasets and storage indexes.
4. **Update dependent systems** (search indexes, caches, derived datasets).
5. **Notify stakeholders** of completion and evidence availability.

## Receipt & Evidence Capture

- Capture purge manifests, job IDs, and hashes of affected datasets.
- Export receipts from `services/receipt-worker` and `server/src/receipts`.
- Attach manifests to the evidence bundle and update
  `COMPLIANCE_EVIDENCE_INDEX.md`.

## Governed Exceptions

- If legal holds or regulatory constraints require partial purge, record a
  **Governed Exception** with the governing authority file and timeline.

## Exit Criteria

- Purge confirmation completed and verified.
- Evidence bundle updated with receipts and manifests.
- Stakeholders acknowledge completion.
