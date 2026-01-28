# SSDF-Derived CI/CD Hardening Blueprint

## Purpose

This blueprint translates SSDF v1.2 practices into Summit’s CI/CD gates, evidence lifecycle, and supply chain enforcement. It anchors requirements to the Summit Readiness Assertion and the governing authority chain (`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`).

## Mandatory Pre-Merge Gates (Mapped to SSDF)

| Gate                        | SSDF Practice | Control                 | Enforcement                                     |
| --------------------------- | ------------- | ----------------------- | ----------------------------------------------- |
| Prompt integrity            | PO.3, PO.6    | Prompt hash registry    | `scripts/ci/verify-prompt-integrity.ts`         |
| Tool registry compliance    | PO.3          | Approved tool usage     | `scripts/ci/registry_audit_gate.mjs`            |
| Evidence-ID consistency     | PO.6, PW.7    | Deterministic evidence  | `scripts/ci/verify_evidence_id_consistency.mjs` |
| SBOM quality                | PS.4, PW.7    | Dependency intake       | `scripts/ci/sbom_quality_gate.mjs`              |
| SBOM signature verification | PS.3, PW.7    | Provenance verification | `scripts/ci/verify-sbom-signature.sh`           |
| Branch protection           | PS.1, PW.5    | Code integrity          | `scripts/ci/branch_protection_gate.mjs`         |

## Build Isolation & Provenance Verification Flow

1. **Source intake**: enforce branch protection and signed commits where available.
2. **Isolated build**: CI runs in hardened containers per `docs/CI_CD_SUPPLY_CHAIN_INTEGRITY_PLAN.md`.
3. **Artifact capture**: generate SBOM and provenance metadata following `docs/standards/SBOM_PROVENANCE_V1.7.md`.
4. **Verification**: validate signatures and evidence IDs with policy gates.
5. **Release promotion**: only artifacts with verified evidence bundles proceed to release.

## Dependency Intake Policy (PS.\* Alignment)

- **Allow-list first**: dependencies must align with `docs/DEPENDENCY_UPDATE_PLAN.md` and `docs/DEPENDENCY_KILL_PROGRAM.md`.
- **SBOM quality gate**: fail builds without compliant SBOMs (`scripts/ci/sbom_quality_gate.mjs`).
- **Provenance verification**: enforce SBOM signature checks before release (`scripts/ci/verify-sbom-signature.sh`).

## Evidence Lifecycle

1. **Generate**: CI emits artifacts and manifests (see `EVIDENCE_BUNDLE.manifest.json`).
2. **Hash**: evidence IDs are deterministic and enforced in `scripts/ci/verify_evidence_id_consistency.mjs`.
3. **Attest**: provenance signatures validated before promotion.
4. **Retain**: evidence bundles are indexed and retained per `docs/compliance/evidence_collection.md`.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: supply chain tampering, artifact substitution, credential theft, prompt injection, tool abuse.
- **Mitigations**: branch protection, tool registry audits, SBOM quality gates, signature verification, evidence-ID consistency checks, observability-backed evidence retention.

## Continuous Assurance Notes

- Evidence freshness is enforced by `scripts/ci/verify_fresh_evidence.sh`.
- This blueprint is intentionally constrained to CI/CD controls; runtime controls remain governed under `docs/SECURITY_OPS.md`.
