# Release Trains

## Overview
Release trains provide a predictable cadence for shipping changes while keeping production deployable at all times. Each train aggregates changes behind a versioned tag, runs the full verification stack, and produces an auditable evidence bundle attached to the release.

## Cadence and Branching
- **Cadence:** Weekly trains cut every Tuesday at 17:00 UTC; emergency hotfix trains may be created as needed.
- **Branches:**
  - `main` remains release-ready.
  - `release/<train-id>` branches are cut from `main` at the freeze point (e.g., `release/2025.09-wk3`).
  - Hotfixes cherry-pick into the active `release/*` branch and back into `main`.
- **Tags:**
  - Release candidates: `vX.Y.Z-rcN`.
  - General availability: `vX.Y.Z`.
  - Train identifiers are embedded in release metadata for traceability.

## Phases
1. **Code Freeze & Branch Cut** – Create `release/<train-id>` and enable merge queue for train-bound PRs.
2. **Stabilization** – Run quality gates (`pr-quality-gate.yml`, security scans, migration drift checks) on the train branch.
3. **Release Candidate** – Tag `vX.Y.Z-rcN`, deploy to staging, and verify SLO/SLA compliance.
4. **GA & Evidence** – Tag `vX.Y.Z`; the release evidence workflow packages the SBOM, migration set, test results, provenance, and release metadata, then attaches the bundle to the GitHub Release.
5. **Post-GA Hardening** – Monitor error budgets and open follow-up issues for regressions discovered after GA.

## Quality and Release Gates
- ✅ CI green on train branch (lint, unit, integration, typecheck, contract tests).
- ✅ Migration drift and schema compatibility validated.
- ✅ SBOM + vulnerability scanning complete for release images.
- ✅ SLO verification (latency, availability, error rate) recorded in the evidence bundle.
- ✅ Provenance and signatures present (SLSA + cosign artifacts).

## Automation
- `.github/workflows/release-train-evidence.yml` runs on every published release tag and on manual dispatch.
- The workflow generates the release metadata (validated against `docs/release/release-metadata.schema.json`), SBOM, checksums, and a signed evidence archive.
- Artifacts are uploaded as both workflow artifacts and GitHub Release assets for reproducibility.

## Reproducibility & Auditability
- Every release asset references a commit SHA and pipeline run identifier.
- Evidence bundles include SHA256 checksums, provenance attestations, and policy/test summaries.
- Release metadata captures the train identifier, semantic version, change scope, and verification outcomes, ensuring that any release can be rebuilt and independently verified.
