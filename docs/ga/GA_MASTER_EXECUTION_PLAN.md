# Summit GA Execution Plan

This plan operationalizes the post-MVP GA mandate to take Summit from RC-capable to GA with auditable proofs. It is structured around the GA bar: deterministic builds/CI, enforced policy, reproducible deploys, explicit runbooks, and verifiable safeguards.

## GA Readiness Delta (vs current RC posture)

- **GA gate unification:** Establish a single blocking workflow that runs lint, build, tests, SBOM, SLSA provenance, license inventory, OPA policy preflight, demo-mode guard, rate-limit verification, and config validation. Current workflows are distributed and need consolidation into a deterministic gate with receipts.
- **Deterministic supply chain evidence:** Formalize SBOM+provenance artifacts for every build and publish them as GA evidence; ensure artifacts are immutable and traceable to commits.
- **Policy enforcement proofs:** Centralize policy-as-code decisions (OPA) with simulated vs enforced traces and emitted receipts. Existing policy code must emit auditable logs and denials with redaction.
- **Security controls coverage:** Explicitly verify authentication, authorization, rate-limiting, and redaction across critical paths; codify coverage through tests or node-native verification rather than best-effort flags.
- **Testing normalization:** Migrate unstable Jest suites to `node:test`+`tsx` where applicable and ensure tests run without local hacks. Enforce strict typing (`tsconfig.strict.json`) on touched code and remove implicit `any`.
- **Operations completeness:** Provide production-ready runbooks (deploy, rollback, incident, key rotation, policy override, demo-mode handling, disaster recovery) executable by non-authors.
- **GA attestation package:** Bundle architecture overview, threat model, gate descriptions, SBOM/provenance artifacts, policy definitions, coverage summary, and bounded limitations in `docs/ga/`.

## Execution Blueprint

### Canonical Artifact Map (authoritative sources)

This plan is anchored to the following GA artifacts already tracked in `docs/ga/`:

- **GA gate specification**: `docs/ga/ga-gate.md`
- **Trust boundaries**: `docs/ga/TRUST-BOUNDARIES.md`
- **Architecture**: `docs/ga/ARCHITECTURE.md`
- **Governance design**: `docs/ga/GOVERNANCE-DESIGN.md`
- **GA checklist**: `docs/ga/ga-checklist.md`
- **Go/No-Go + Day-0 runbook**: `docs/ga/exec-go-no-go-and-day0-runbook.md`
- **Claims vs evidence matrix**: `docs/ga/claims-vs-evidence.md`
- **GA declaration**: `docs/ga/ga-declaration.md`

All new GA work must update these artifacts (or add new ones with explicit cross-links) so the
attestation package can be assembled without ambiguity.

### Phase 1 — Codebase Finalization

1. Replace any legacy/implicit behavior (silent skips, ignored lint) with explicit allowlists or documented waivers checked into the repo.
2. Validate each critical path for authN/authZ, rate-limits, and redacted logging; add tests or node-native verification harnesses for coverage.
3. Normalize tests: migrate flaky Jest suites to `node:test`+`tsx`, ensure CI-friendly invocation, and enforce strict typing on touched code (no `any`).

### Phase 2 — CI/Release Gates

- Create a **single GA gate workflow** (e.g., `.github/workflows/ga-gate.yml`) that blocks merges unless all steps pass:
  - Lint → Build → Tests
  - SBOM generation (attach artifact)
  - SLSA provenance (attest to build inputs/outputs)
  - License inventory (export report)
  - Policy preflight (OPA) with receipts
  - Demo-mode guard (fail if demo flags misconfigured)
  - Rate-limit verification suite
  - Config validation (schema-based)
- Document each gate in `docs/ga/CI_GATES.md`, including commands, inputs, outputs, and acceptance criteria.

#### Gate-to-command mapping (baseline)

The GA gate should call the same commands documented across repo standards to ensure consistency:

- **Lint**: `pnpm lint`
- **Typecheck**: `pnpm typecheck`
- **Build**: `pnpm build`
- **Tests**: `pnpm test`
- **Golden path smoke**: `make smoke`

If any command diverges (e.g., scoped filters for stability), document the rationale, scope, and
expiry date in the gate docs and in the GA evidence index.

### Phase 3 — Security & Governance

1. Produce/update threat model with trust boundaries, attacker assumptions, and mapped mitigations.
2. Implement policy proofing: simulate policy decisions, assert enforced decisions, and emit receipts; include verification scripts and sample outputs.
3. Harden secrets/config: confirm no secrets are logged, defaults are safe, and failure modes fail closed; document findings and safeguards.

### Phase 4 — Operations & Runbooks

- Maintain runbooks in `docs/ga/runbooks/` covering deploy, rollback, incident response, key rotation, policy override, demo-mode behavior, and disaster recovery. Each runbook must be executable by non-authors and include validation/rollback steps.

### Phase 5 — GA Attestation Package

- Assemble `docs/ga/ATTESTATION.md` with architecture overview, threat model summary, CI gate description, SBOM/provenance pointers, policy definitions, test coverage summary, and explicit bounded limitations.
- Include locations of generated artifacts (SBOM, provenance, policy receipts) and how to verify their authenticity.

### Evidence Index (required for GA sign-off)

Maintain an explicit evidence inventory linking each GA claim to concrete artifacts. At minimum:

- **Policy enforcement evidence**: policy receipts, simulation transcripts, and enforcement logs.
- **CI gate evidence**: GA gate reports, build logs, and test outputs.
- **Supply chain evidence**: SBOM and provenance artifacts, plus their verification commands.
- **Operational evidence**: runbook execution logs or dry-run results.
- **Security evidence**: threat model, boundary definitions, and controls mapping.

Reference `COMPLIANCE_EVIDENCE_INDEX.md` and `docs/ga/claims-vs-evidence.md` for baseline structure
and ensure new evidence updates both locations.

## Evidence & Acceptance

- **Determinism:** Builds and CI must be reproducible with pinned toolchains; include provenance attestations proving inputs/outputs.
- **Enforcement:** Any failure in the GA gate blocks merge. Allowances must be tracked via explicit allowlists with justification and expiry.
- **Observability:** Logs must redact secrets by default; security-sensitive actions are auditable with human-attributed provenance.
- **Verification:** Tests and verification harnesses must run headlessly in CI without local-only flags; coverage targets must be documented for changed code.
- **Documentation:** No TODOs or placeholders. Each artifact path must be explicit, and runbooks must be validated via dry-run or staging exercises.

## Innovation Forward-Look

- Adopt **hermetic builds** (e.g., Nix/containers) for deterministic pipelines.
- Layer **policy-controlled feature flags** so demo-mode and safety modes are enforced by OPA rather than ad-hoc env vars.
- Introduce **rate-limit verification harnesses** that replay recorded traffic to validate limits and logging behavior under load.
