# Release Readiness Checklist

## Pre-Release Gates

- [ ] All P0 backlog items are closed with verification evidence.
- [ ] `pnpm --filter intelgraph-server test` passes with zero failures.
- [ ] `make smoke` succeeds in local and CI environments.
- [ ] `pr-quality-gate.yml` workflow is green on the release branch.
- [ ] `ga-ready.yml` workflow is green on the release branch.

## Security & Compliance

- [ ] Audit log persistence is implemented and verified.
- [ ] Hash-chain tamper-evidence is validated.
- [ ] No runtime AKIA sample keys exist in `server/src/`.
- [ ] OPA policy evaluation failures are explicitly handled and logged.
- [ ] `pnpm audit --prod` completes with no critical vulnerabilities (or documented exceptions).

## Documentation & Governance

- [ ] `docs/roadmap/STATUS.json` is updated with sprint outcomes.
- [ ] Release notes draft is reviewed and approved.
- [ ] Risk register is updated with residual risks and mitigations.

## Rollback Readiness

- [ ] Feature flags are in place for high-risk changes (e.g., audit sink).
- [ ] Governed Exception path is documented for critical failures.
- [ ] Database migration rollback scripts are tested (if applicable).

## Sign-Off

- [ ] Engineering lead has approved the release.
- [ ] Security review is complete (or waived with documented rationale).
- [ ] Product owner has approved the release scope.
