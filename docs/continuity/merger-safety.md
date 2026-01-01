# Merger & Acquisition Safety Checklist

M&A events are prime capture vectors. This checklist hardens Summit before, during, and after acquisitions or mergers.

## Pre-Merger

- Perform constraint audit: confirm Purpose Lock, safety invariants, and policy bundles are active and logged.
- Map data flows and identify where partner systems could bypass provenance or policy enforcement.
- Require legal attestation that Summit's red-lines and safety invariants remain binding post-transaction.
- Freeze schema changes and limit connector onboarding until post-merge review completes.

## Due Diligence Data Room

- Provide read-only access to safety documentation, policy bundles, and audit proofs.
- Share Drift Sentinel reports and capture risk assessments.
- Publish cryptographic fingerprints of critical doctrine and Rego policies.

## Integration Controls

- Enforce ingress/egress mediation through the policy gateway; no direct DB integrations.
- Require dual approvals for any change to data retention, sharing, or ranking defaults.
- Validate identity mappings and RBAC translations before enabling cross-tenant access.

## Post-Merger Invariants

- Purpose Lock clauses become non-derogable terms in the integration plan.
- Provenance logging, policy enforcement, and audit sinks must remain enabled for all merged workloads.
- Re-run safety and drift scans; block go-live if deviations exceed thresholds.

## Evidence Continuity

- Preserve original hashes of core documents and policies; store in both parties' ledgers.
- Maintain chain-of-custody for data migrations with signed manifests and checksums.
- Generate a post-merge report documenting any deviations, waivers, and remediation dates.

## Exit & Rollback Plan

- If integration threatens red-lines, halt rollout and revert to pre-merge deployment baseline.
- Escalate to governance council with evidence and recommended mitigations.
- Maintain an isolated fail-safe environment to continue serving core users without compromised changes.
