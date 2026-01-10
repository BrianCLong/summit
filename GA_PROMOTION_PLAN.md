# Summit v4.0.0 GA Promotion Plan

This plan captures the conditions, remediation steps, and verification activities required to promote Summit v4.0.0-rc1 to the final GA release.

## Objectives

- Resolve remaining Jest/ESM `import.meta` test failures and achieve a 100% green test suite across all 688 suites / 2,860 tests.
- Reconcile PRs blocked by unrelated histories while preserving governance verdict wrapping and provenance metadata.
- Validate compliance, security, and performance invariants and prepare final release artifacts (notes, migration guide, GA tag).

### Parallel Execution Groups (Golden Path-aligned)

To maximize velocity without compromising the golden path, coordinate work across the following concurrent groups. Each group must
publish daily checkpoints in `GO_NO_GO_GATE.md` and block merges on missing evidence or red CI.

1. **Reliability & ESM Hardening Pod**: Owns Jest/TypeScript ESM alignment, `import.meta` polyfills, and stabilization reruns.
2. **Governance & Provenance Pod**: Replays cherry-picks with provenance stamps, validates verdict wrapping, and audits OPA policy
   coverage for reconciled PRs.
3. **Compliance & Security Pod**: Drives HIPAA/SOX evidence refresh, HSM/zero-trust ledger validation, and ensures SOC mappings
   stay in sync with code changes.
4. **Performance & Observability Pod**: Executes load/regression runs on policy suggestion latency, presence overlays, and
   capacity planning; publishes dashboards and alerts for rollback triggers.
5. **Release Readiness Pod**: Manages version bumps, release notes/migration guide updates, GA tag prep, and stakeholder comms.

Escalate blocking issues to the Release Captain immediately and mark the impacted checklist item(s) as "at risk" with owner and
ETA.

## Remediation Workstreams

### 1) Test & Tooling Stabilization

- Align Jest + TypeScript config for ESM: ensure `"module": "esnext"`, `"moduleResolution": "bundler"` (or NodeNext where required), `"allowImportingTsExtensions": true`, and enable `transform` for `.mjs`/`.mts` in Jest.
- Extend `jest.setup.(ts|js)` to polyfill `import.meta.url`, `crypto.randomUUID`, and mock Redis/HSM connectors for ESM.
- Audit test helpers for CommonJS interop (`require`/`module.exports`) and convert to ESM or add `default` shims.
- Normalize path aliases to `tsconfig.paths.json` and mirror in Jest `moduleNameMapper`.
- Re-run focused suites (`pnpm test -- projects server client packages`) until clean; then execute full `pnpm test --runInBand --maxWorkers=50%` for stability signal.

### 2) PR History Reconciliation

- Identify PRs marked "unrelated histories"; fetch their topic branches and compare against `main` tip.
- Use `git log --graph --decorate --oneline main..<topic>` to isolate divergent commits.
- Cherry-pick relevant changes atop current `main`, resolving conflicts manually (priority: semantic search, schema evolution, capacity planning, audit events, presence overlays).
- Verify each cherry-pick preserves governance verdict wrapping, provenance metadata stamping, and type safety boundaries.

### 3) Coverage & Integration Validation

- Increase coverage for newly merged features: semantic search, schema evolution, capacity planning, audit events, presence overlays, policy suggestions under load, HIPAA/SOX assessments, HSM key management, zero-trust audit ledger.
- Ensure integration tests exercise cross-cutting concerns (policy suggestion load, audit ledger durability, crypto/HSM flows).
- Capture coverage artifacts and compare against baseline thresholds before GA sign-off.

### 4) Lint & Quality Sweep

- Triage the ~7,816 lint warnings; prioritize correctness/perf-impactful categories (unused variables, unhandled promises, `any` leakage, unsafe casts).
- Resolve TODOs/FIXMEs that affect release behavior; document remaining low-risk items for post-GA follow-up in `GO_NO_GO_GATE.md`.
- Ensure inline documentation references SOC 2 mappings where relevant and update `COMPLIANCE_SOC_MAPPING.md` if control owners change.

### 5) Release Artifacts & Versioning

- Bump version numbers from `v4.0.0-rc1` to `v4.0.0` across package manifests and Helm/terraform overlays.
- Update release notes & migration guide with ESM/Jest fixes, reconciled PRs, and any API behavior changes.
- Refresh RC preparation doc to reflect resolved blockers and final acceptance criteria.

## GA Readiness Checklist

- [ ] 100% test pass across all suites; CI green on `main`.
- [ ] Lint/typecheck clean or only documented low-risk waivers.
- [ ] Provenance ledger and governance verdict wrapping intact for all changed paths.
- [ ] Compliance review complete (HIPAA/SOX, SOC 2 mappings updated, HSM/HIPAA safeguards validated).
- [ ] Security review complete (zero-trust audit ledger, key management, secrets handling).
- [ ] Performance/regression benchmarks within SLOs (policy suggestion latency under load, presence overlays, capacity planning).
- [ ] Release notes & migration guide updated; GA tag `v4.0.0` prepared and pushed.
- [ ] Stakeholder communication drafted; post-launch support plan in place.

## GA Tag & Deployment Steps

1. Ensure `main` is green and all reconciliation commits are merged.
2. Tag: `git tag -a v4.0.0 -m "Summit 4.0.0 GA" && git push origin v4.0.0`.
3. Promote release in GitHub and trigger CI/CD GA deployment pipeline.
4. Monitor rollout with observability dashboards; initiate rollback plan on SLO violations.
5. Publish post-launch report and transition to maintenance cadence.

## Risks & Mitigations

- **ESM/Jest drift**: lock Jest + TS config and add regression tests for `import.meta` consumers.
- **Divergent histories**: prefer cherry-pick over merge to avoid accidental regressions; maintain provenance annotations.
- **Compliance regressions**: re-run HIPAA/SOX assessment suites and verify audit ledger immutability after changes.

## Forward-Looking Enhancements

- Add CI job to enforce ESM compatibility checks (`node --experimental-vm-modules` + Jest nodeNext) and snapshot `jest --listTests` to detect new CJS regressions.
- Introduce `pnpm lint:critical` to gate correctness warnings before GA and create coverage budget alerts for high-risk domains.
- Add contract tests for policy engine <-> audit ledger to guarantee governance verdict coverage across releases.
