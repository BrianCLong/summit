# Release Readiness Checklist

## Pre-Release Gates

- [x] All P0 backlog items are closed with verification evidence.
- [x] `pnpm --filter intelgraph-server test` passes with zero failures.
- [x] `make smoke` succeeds in local and CI environments.
- [x] `pr-quality-gate.yml` workflow is green on the release branch.
- [x] `ga-ready.yml` workflow is green on the release branch.

## Security & Compliance

- [x] Audit log persistence is implemented and verified.
- [x] Hash-chain tamper-evidence is validated.
- [x] No runtime AKIA sample keys exist in `server/src/`.
- [x] OPA policy evaluation failures are explicitly handled and logged.
- [x] `pnpm audit --prod` completes with no critical vulnerabilities (or documented exceptions).

## Documentation & Governance

- [x] `docs/roadmap/STATUS.json` is updated with sprint outcomes.
- [x] Release notes draft is reviewed and approved.
- [x] Risk register is updated with residual risks and mitigations.

## Rollback Readiness

- [x] Feature flags are in place for high-risk changes (e.g., audit sink).
- [x] Governed Exception path is documented for critical failures.
- [x] Database migration rollback scripts are tested (if applicable).

## Sign-Off

- [x] Engineering lead has approved the release.
- [x] Security review is complete (or waived with documented rationale).
- [x] Product owner has approved the release scope.
