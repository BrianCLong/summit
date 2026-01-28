# SSDF v1.2 Gaps and Overachievement Analysis

## New / Expanded in v1.2

- **PO.6 evidence-first assurance**: Summit aligns this with Evidence-ID gating, GA evidence bundles, and the Summit Readiness Assertion to enforce traceability between policy, CI gates, and release artifacts. See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/GA_CONTROL_EVIDENCE_BUNDLE.md`.
- **PS.4 dependency intake controls**: Summit already operationalizes dependency intake with SBOM quality gates and dependency kill programs; v1.2 makes these expectations explicit. See `docs/SBOM-VULN-AUTOMATION.md` and `docs/DEPENDENCY_KILL_PROGRAM.md`.
- **Risk task wording upgrades**: v1.2 expects continuous risk refresh; Summit’s risk ledger and security action plan already tie evidence cadence to the risk register. See `docs/RISK_LEDGER.md` and `docs/SECURITY_ACTION_PLAN.md`.

## Summit Already Exceeds Guidance

- **Evidence-ID consistency and deterministic traceability**: Summit’s Evidence-ID gate plus CI manifesting enables deterministic evidence bundles rather than point-in-time checklists. See `scripts/ci/verify_evidence_id_consistency.mjs` and `EVIDENCE_BUNDLE.manifest.json`.
- **Prompt integrity and tool registry enforcement**: Summit enforces prompt hashes and tool registry checks in CI, exceeding baseline SSDF guidance on pipeline integrity. See `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/registry_audit_gate.mjs`.
- **Provenance plus SBOM quality gates**: Summit not only generates SBOMs but also enforces SBOM quality and signature checks. See `scripts/ci/sbom_quality_gate.mjs` and `scripts/ci/verify-sbom-signature.sh`.

## Gaps / Ambiguities

- **Evidence retention SLAs**: SSDF v1.2 still permits narrative compliance without explicit evidence retention timing. Summit requires evidence freshness checks but retains a gap for formal retention SLAs. Deferred pending a policy-as-code retention schedule aligned to `docs/compliance/evidence_collection.md`.
- **Provenance verification strength**: SSDF mentions provenance but does not require verification of attestation signatures prior to merge. Summit requires this for release, but merge-time enforcement is only partial. Intentionally constrained until dependency policy gates are unified.
- **Supplier evidence ingestion**: SSDF guidance is vague on ingesting third-party evidence artifacts into CI. Summit needs a policy-coded ingest workflow to prevent manual-only attestations. Deferred pending a supplier evidence intake spec.

## Recommended Enhancements

- **Codify “evidence completeness”**: Recommend SSDF require machine-verifiable evidence manifests (e.g., build logs, SBOM, provenance) for each release. Summit already uses evidence bundles and can supply example schemas from `EVIDENCE_BUNDLE.manifest.json`.
- **Require provenance verification, not just generation**: Explicitly call for signature verification and attestation replay in CI, referencing practices in `scripts/ci/verify-sbom-signature.sh`.
- **Formalize dependency intake policies**: SSDF should require SBOM quality gates and dependency policy enforcement (e.g., deny-list checks) before merge. Summit’s `scripts/ci/sbom_quality_gate.mjs` provides a concrete control.
- **Mandate risk register refresh cadence**: SSDF should include a minimum cadence for risk ledger updates plus evidence of refresh; Summit’s `docs/RISK_LEDGER.md` plus CI evidence freshness checks demonstrate the pattern.

## Alignment Mandate

Summit aligns all artifacts to the authority chain defined in `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and `docs/SUMMIT_READINESS_ASSERTION.md` to ensure consistency and enforceable readiness gates.
