# Attest SBOM & Build Attestation Verifier – Jira Backlog

The following tickets deliver the `attest verify` tool as an isolated CI utility that validates CycloneDX SBOMs and in-toto/SLSA provenance artifacts using cosign public keys. Each ticket incorporates the program constraints that work must remain path-isolated (`tools/attest/**`), operate fully offline/deterministically, and initially land as non-blocking checks before promotion to required status.

## Epic Overview

- **Epic Name:** Attestation Verifier Enablement
- **Goal:** Ship a hardened verification CLI that ingests CI artifacts, validates signatures, surfaces dependency drift, and emits a signed verification report plus optional PR delta comment.
- **Success Metrics:**
  - CI signal covers SBOM + provenance integrity (signature + digest enforcement).
  - Generated verification report matches golden snapshots and is reproducible.
  - Dependency drift surfaced within 5 minutes of CI job completion.
  - Progressive enforcement toggle documented and exercised after one week of green runs.
- **Dependencies:** Existing cosign key distribution, CycloneDX schema fixtures, and CI secrets for PR comment emission (optional).

---

## Ticket 1 – Story – CLI Contract & UX Envelope

- **Summary:** Design and implement the `attest verify` CLI entry point with flag validation and contextual help that emphasises offline execution requirements.
- **Acceptance Criteria:**
  1. `attest verify --help` lists required flags `--sbom`, `--provenance`, `--key`, notes offline-only operation, and documents report output path.
  2. CLI rejects missing/duplicate flags with actionable error messages and exit code `2`.
  3. CLI exits non-zero when files are unreadable or JSON parsing fails before verification starts.
  4. Usage examples in help reference fixture directories under `tools/attest/fixtures`.
- **Subtasks:**
  - Define CLI contract and usage examples (markdown snippet + integrated `--help`).
  - Implement argument parsing + validation leveraging shared config helpers.
  - Add unit tests covering success, missing flag, and unreadable file scenarios.
  - Wire CLI invocation into `package.json` / `Justfile` task for CI invocation.

## Ticket 2 – Story – CycloneDX SBOM Verification Engine

- **Summary:** Build SBOM loader/validator that enforces schema compliance, signature validation, and digest integrity for CycloneDX JSON documents.
- **Acceptance Criteria:**
  1. SBOM parser validates against bundled CycloneDX JSON schema without network fetches.
  2. Signature verification fails with explicit errors when signatures are absent, malformed, or mismatch cosign public key.
  3. Component digests are recalculated and mismatches raise verification failure including component identifiers.
  4. Happy-path fixture (`fixtures/sbom/good.json`) passes with no warnings.
- **Subtasks:**
  - Add schema bundle and offline validation routine.
  - Implement signature verification helper (cosign public key support only).
  - Implement digest reconciliation + structured error reporting.
  - Author unit tests for good and bad SBOM fixtures (missing sigs, digest drift).

## Ticket 3 – Story – Provenance Verification Engine

- **Summary:** Implement provenance validator ensuring required supply-chain steps, signatures, and recorded digests align with provenance payload.
- **Acceptance Criteria:**
  1. Provenance artifacts load offline; schema validation uses vendored in-toto/SLSA definitions.
  2. Missing or reordered supply-chain steps trigger failure with step identifier context.
  3. Signature validation covers key ID + payload digest, failing on mismatch.
  4. Valid provenance fixture passes with explicit success summary.
- **Subtasks:**
  - Vendor provenance schemas + helpers for step validation.
  - Implement step/digest verification logic with reusable utility surface.
  - Add negative tests (missing step, mismatched digest, missing signature).
  - Document provenance assumptions in module README.

## Ticket 4 – Story – Cross-Artifact Correlation & Drift Detection

- **Summary:** Compare SBOM components to provenance outputs to detect drift, missing components, and mismatched digests.
- **Acceptance Criteria:**
  1. Verification fails when any SBOM component lacks provenance coverage (and vice versa).
  2. Digest mismatches produce structured failure including both values and component references.
  3. Success path emits correlation summary in report payload.
  4. Logic executes deterministically regardless of component order in input files.
- **Subtasks:**
  - Implement correlation engine and normalised component indexing.
  - Extend fixtures to include drift scenarios and golden expectations.
  - Add tests covering missing component, added component, and digest mismatch.
  - Ensure failures annotate remediation guidance (e.g., regenerate artifacts).

## Ticket 5 – Story – Signed Verification Report Generation

- **Summary:** Produce deterministic verification report summarising SBOM/provenance outcomes and sign it using cosign.
- **Acceptance Criteria:**
  1. Report captures overall status, per-check results, component digest summaries, and dependency delta reference.
  2. Report signing uses cosign key material offline; verification fails if signing step fails.
  3. Identical inputs yield byte-for-byte identical report + signature artifacts (validated via snapshot tests).
  4. Report path and filenames configurable via CLI flag with sane defaults in `./out/verification-report`.
- **Subtasks:**
  - Define report schema + JSON serialization with stable ordering.
  - Integrate cosign signing command/library in offline mode with injected key path.
  - Author snapshot tests for success/failure cases.
  - Document report consumption and storage expectations.

## Ticket 6 – Story – Dependency Delta Computation & PR Commenter

- **Summary:** Provide optional dependency drift diff + PR comment integration that runs post-verification with offline toggles.
- **Acceptance Criteria:**
  1. Delta engine categorises added/removed/changed components using SBOM diffing logic.
  2. PR comment template renders markdown table + summary, idempotent across reruns.
  3. Comment emission respects `--no-pr-comment` flag and environment detection for offline mode; default is disabled.
  4. CI workflow example demonstrates safe usage with GitHub token gating.
- **Subtasks:**
  - Implement SBOM diff module with deterministic ordering + filtering for non-code components.
  - Build markdown formatter with unit tests (golden snapshots).
  - Add CI helper script to post/update PR comment with retry/backoff (no external APIs beyond GitHub).
  - Provide documentation snippet covering enablement + security posture.

## Ticket 7 – Story – Acceptance Test Suite & Progressive Enforcement

- **Summary:** Assemble end-to-end acceptance harness exercising fixtures, ensuring deterministic output, and documenting progressive enforcement plan.
- **Acceptance Criteria:**
  1. Test harness executes entirely offline, using vendored fixtures + cosign keys.
  2. Suite covers success, missing signature, mismatched digest, missing supply-chain step, and drift scenarios.
  3. CI job integrated as non-blocking status check with documented promotion plan after seven consecutive green runs.
  4. Golden outputs stored under `tools/attest/testdata` with regeneration instructions.
- **Subtasks:**
  - Scaffold acceptance harness (likely using Jest or pytest—document choice) with deterministic seeding.
  - Add fixtures and golden outputs; provide regeneration script.
  - Wire CI workflow invoking harness in non-blocking mode + promotion doc.
  - Capture runbook entry for troubleshooting failures.

## Ticket 8 – Story – Documentation, Onboarding & Security Review

- **Summary:** Deliver comprehensive documentation, onboarding materials, and security review sign-off for attestation verifier rollout.
- **Acceptance Criteria:**
  1. README (or docs page) covers installation, CLI usage, offline verification philosophy, and deterministic testing guidance.
  2. Runbook outlines progressive enforcement toggle, CI wiring, and rollback procedures.
  3. Security review checklist completed (threat model, key management, offline assumptions) with stakeholder approvals recorded.
  4. Change-log entry documents initial non-blocking release and planned enforcement milestone.
- **Subtasks:**
  - Draft README + runbook updates, cross-linking fixtures/tests.
  - Host security walkthrough with stakeholders; capture decisions in `docs/decisions/` ADR.
  - Add changelog entry and announcement snippet for release notes.
  - Ensure documentation references signed report schema + PR comment behaviour.

---

### Cross-Cutting Considerations

- **Path Isolation:** All implementation lives under `tools/attest/**`; no shared app/service code is modified.
- **Determinism:** Tests rely exclusively on vendored data; no network I/O permitted.
- **Security Posture:** Cosign keys treated as inputs; no secret material committed. Offline verification is mandatory.
- **Progressive Enforcement:** Non-blocking status documented in Tickets 7 and 8 with explicit plan to promote after sustained stability.
