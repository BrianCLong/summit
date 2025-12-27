# Multi-Step Delivery Plan for Supply-Chain, Reliability, and Governance Gates

## Objectives

- Deliver eight independent but additive safeguards: SBOM/signature gate, reproducible-build harness, rollout controller, vulnerability gate, workflow permissions, narrative drafts, policy regression suite, and generated-artifact integrity gate.
- Preserve production runtime behavior; changes land via CI tooling, feature flags, or additive endpoints.
- Provide deterministic, test-backed workflows with clear failure fixtures and recovery paths.

## Phase 0: Foundations (Day 0)

1. **Inventory & scopes**: Confirm directories, AGENTS rules, and existing CI workflows. Baseline lockfiles, generators, and feature-flag scaffolding.
2. **Test harness prep**: Add shared fixtures under `tests/fixtures/policy/` and `tests/fixtures/supply-chain/` to reuse across gates.
3. **Toolchain standardization**: Pin CycloneDX/SPDX generators (Node + Python), hashing utility (SHA256), and tarball normalizer for reproducible-build harness.

## Phase 1: Supply-Chain SBOM Gate

1. **Script**: `scripts/sbom` generates CycloneDX for backend (`server/`, `services/`, `packages/`) and frontend (`client/`, `web/`). Accepts `--format` (json/xml) and `--out dir`.
2. **Policies**: Rule set enforced by evaluator module:
   - Block licenses in denylist (seed: `GPL-3.0`, `AGPL-3.0`, `SSPL-1.0`).
   - Reject deps missing lockfile pins or mismatched lockfile hashes.
   - Optional: verify signatures where ecosystem supports; otherwise verify checksums of resolved artifacts.
3. **Fixtures/tests**: Add “bad dep” lockfile fixture and evaluator unit tests covering license, unpinned, tampering cases.
4. **CI job**: `ci:sbom` publishes SBOM artifact, fails on policy violation.

## Phase 2: Reproducible Build Harness

1. **Script**: `scripts/repro-build` runs target build twice in isolated temp dirs, normalizes timestamps/paths, and diff/hashes outputs.
2. **Report**: Emit `repro-report.json` with deterministic file list and classification (stable/unstable), plus human-readable summary.
3. **Tests**: Fixture with intentional nondeterminism (e.g., timestamped output) to assert detection and report formatting.
4. **CI**: Nightly job wiring; optional PR gate flag once baseline is stable.

## Phase 3: Rollout Controller (Blue/Green with Feature Flags)

1. **API**: Add `POST /ops/rollouts`, `/ops/rollouts/:id/advance`, `/ops/rollouts/:id/rollback` guarded by `ROLLOUTS=true` and admin auth.
2. **Cohorts**: Percent-based and tenant allowlists; store rollout state in existing feature-flag store (or minimal store if absent).
3. **Health checks**: Integrate with metrics provider to evaluate error/latency thresholds; rollback disables cohort on breach.
4. **Tests**: Integration tests with mocked metrics, cohort evaluation, and rollback scenarios.

## Phase 4: Vulnerability Gate

1. **Scanner wrapper**: `scripts/vuln-scan` consumes scanner JSON (mocked in tests) and enforces policy: fail on reachable Critical/High (or simpler initial rule), track new vs baseline.
2. **Suppressions**: File with expiry + justification; must be respected and tested.
3. **Outputs**: `vuln-report.json` plus human-readable summary; CI job fails on policy violations.
4. **Fixtures/tests**: Seeded vuln JSON to trigger fail/pass paths and suppression expiry handling.

## Phase 5: Workflow Permissions

1. **Permissions**: Define `runbook.execute`, `approval.request`, `export.release`, `legalhold.create` in `server/src/permissions/workflows.ts` under feature flag `WORKFLOW_PERMS=true`.
2. **Enforcement**: Guard three representative endpoints; return structured deny responses with reason codes.
3. **Docs**: Generated permission matrix update hook.
4. **Tests**: Integration allow/deny matrix across roles.

## Phase 6: Case Narrative Draft Generator

1. **Endpoint**: `POST /cases/:id/narrative/draft` under `NARRATIVE_DRAFT=true` flag.
2. **Behavior**: Deterministic sections (overview, timeline, entities, claims, open questions); every bullet requires ≥1 citation; uncited items emitted as gaps.
3. **Tests**: Golden fixture asserting all bullets have citations and gaps are listed.

## Phase 7: Policy Regression Pack

1. **Fixtures**: `test/policy/regression/*.json` with actor/resource/decision scenarios (least privilege, break-glass, share-links, exports, legal holds).
2. **Runner**: Validates current policy engine, outputs human-readable diff report; CI gate requires approval label or fixture update when diffs occur.
3. **Tests**: Suite itself plus diff formatting unit tests; seeded drift fixture ensures failure signal.

## Phase 8: Generated Artifacts Integrity Gate

1. **Canonical generators**: `scripts/gen-all` orchestrates SDK, permission matrix, schema reports, SBOM, etc.; enforce deterministic ordering and timestamps.
2. **CI step**: `ci:generated-check` reruns generators and fails on diff.
3. **Tests**: Registry unit tests and drift detection fixture.

## Cross-Cutting Concerns

- **Feature flags**: Ensure all runtime changes are behind flags (`ROLLOUTS`, `WORKFLOW_PERMS`, `NARRATIVE_DRAFT`).
- **Observability**: Add structured logs and metrics counters for gates and rollouts.
- **Security**: Express compliance as policy-as-code; never embed secrets; prefer checksum/signature validation.
- **Docs**: Update README/ops guides where developers run scripts locally; include troubleshooting and baseline commands.
- **Risk/rollback**: Each CI job should have a bypass/approval label in emergencies; rollback by disabling feature flags or reverting config-only changes.

## Innovative Enhancements

- **Content-addressed artifacts**: Optionally store SBOMs and build outputs in a CAS to accelerate reproducibility checks.
- **Determinism helpers**: Provide a shared `normalize-tar` utility to strip timestamps/uid/gid from archives for stable hashing.
- **Metrics**: Emit OpenTelemetry spans for rollout transitions and gate evaluations to aid auditing.

## Timeline (Optimistic)

- Week 1: Phases 0–2; baseline reproducibility and SBOM gate.
- Week 2: Phases 3–4; rollout controller and vuln gate.
- Week 3: Phases 5–6; workflow perms and narrative drafts.
- Week 4: Phases 7–8; regression pack and generated-artifact integrity; polish docs and CI hardening.
