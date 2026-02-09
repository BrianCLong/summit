# Agent Launch Runbook for P0/P1 Remediation

This runbook operationalizes the previously defined two-phase remediation plan for the server TypeScript build regression. It maps agents to workstreams, defines the activation sequence, and sets success criteria so that each fix is auditable and production-ready.

## Scope and Objectives

- **Primary target:** Resolve the server TypeScript build blocker surfaced in `tsc_output.txt`, starting with the file-list TS6307 errors and express router typing issues.
- **Zones:** Server backend (`server/`), CI workflows (`.github/workflows/`), and documentation (`docs/`, `runbooks/`).
- **Non-goals:** UI changes, data-plane schema changes, or runtime feature additions outside the build stability effort.

## Agent Roster and Activation Steps

### 1) CI Hardening Agent

- **Inputs:** `server/tsconfig.json`, `server/tsconfig.build.json`, `tsc_output.txt`, relevant GitHub Actions workflows.
- **Actions:**
  - Normalize include/exclude patterns to eliminate TS6307 file-list errors.
  - Add deterministic `tsc` compile gate to CI for `server/` (fail-fast on type errors).
  - Generate build logs as artifacts for traceability.
- **Acceptance Criteria:** `pnpm --filter server tsc -b` (or repo-standard equivalent) exits 0 locally and in CI; new CI step marked required.

### 2) Architecture & Invariant Enforcement Agent

- **Inputs:** Updated tsconfig files, architecture guardrails in `docs/FIRST_PRINCIPLES_REDESIGN.md`.
- **Actions:**
  - Verify module boundary compliance after tsconfig adjustments.
  - Refactor imports only if necessary to maintain boundaries; document rationale.
- **Acceptance Criteria:** `scripts/check-boundaries.cjs` passes; no new circular dependencies.

### 3) Test & Verification Saturation Agent

- **Inputs:** Clean TypeScript build, updated module surfaces.
- **Actions:**
  - Add/repair unit and integration tests for newly compiled paths (health checks, conductor, observability, graph services).
  - Ensure coverage for router typing regressions via request-level tests.
- **Acceptance Criteria:** Test suite green in CI; coverage for touched modules non-regressive.

### 4) Security & Policy Enforcement Agent

- **Inputs:** Affected server modules (auth, backup, cache, conductor, routes), SECURITY guidelines.
- **Actions:**
  - Re-run threat assessment on newly compiled modules; add policy-as-code checks where gaps exist.
  - Validate no secrets or PII handling regressions in added code paths.
- **Acceptance Criteria:** No open P0/P1 security findings; policy checks codified in CI where applicable.

### 5) Documentation & Runbooks Agent

- **Inputs:** Changes from Agents 1–4, CI outputs.
- **Actions:**
  - Update developer docs with new build steps and troubleshooting for TS6307/TS2742 classes of errors.
  - Maintain linkage to `docs/roadmap/STATUS.json` as required.
- **Acceptance Criteria:** Docs reflect current build pipeline; onboarding steps mention CI gates and evidence artifacts.

### 6) Release Engineering & GA Gates Agent

- **Inputs:** Stable CI gate, verification artifacts.
- **Actions:**
  - Wire GA gates to require green TypeScript compile and evidence bundles.
  - Capture SBOM/provenance artifacts for release candidates.
- **Acceptance Criteria:** Release workflows block on TS build failure; provenance artifacts stored per `PROVENANCE_SCHEMA.md`.

## Execution Waves

1. **Wave 1 (blocking):** CI Hardening Agent establishes green TypeScript build.
2. **Wave 2 (parallel after build green):** Architecture & Security agents validate boundaries and controls.
3. **Wave 3:** Test & Documentation agents extend coverage and update guidance.
4. **Wave 4:** Release Engineering agent updates gates and provenance hooks.

## Command Palette

- Build check: `pnpm --filter server tsc -b`
- Boundary check: `node scripts/check-boundaries.cjs`
- CI metadata validation: `node scripts/ci/validate-pr-metadata.ts`
- Prompt integrity: `node scripts/ci/verify-prompt-integrity.ts`

## Evidence and Observability

- Store build logs under `artifacts/ci/tsc/*.log` per run.
- Attach agent run records to `artifacts/agent-runs/{task_id}.json`.
- Update `docs/roadmap/STATUS.json` in the same PR when closing items or reducing debt.

## Risk Controls and Rollback

- **Rollback triggers:** New TS errors, CI instability, or boundary violations after tsconfig changes.
- **Rollback plan:** Revert offending tsconfig or module changes; restore last-known-good buildinfo; rerun `pnpm --filter server tsc -b` before merge.
- **Safety nets:** Required CI gates; no fast-forward merges without green build and metadata validation.
