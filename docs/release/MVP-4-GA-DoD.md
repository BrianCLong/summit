# MVP-4 GA Definition of Done

This checklist defines the minimum release readiness for the MVP-4 GA cut. It is intentionally prescriptive so that evidence can be produced automatically by the GA Gate script and CI job.

## Core Requirements

### Security

- Dependency health: critical CVEs are triaged or patched; `ci-security.yml` baseline must be green.
- Secrets hygiene: Gitleaks (or equivalent) passes and any leaks are remediated.
- AuthZ/AuthN invariants validated: security runbooks and RBAC matrices updated for the release.

### Testing

- Fast smoke completes (`npm run test:quick` at minimum); flaky suites are noted with links to quarantine runs.
- Change-impact tests (unit/integration) are identified and either executed or explicitly deferred with rationale.
- Type safety upheld: `npm run typecheck` or an equivalent scoped type check is run for touched packages.

### Observability

- Dashboards and alerts updated for any new signals; links recorded in the release metadata.
- Golden-path probe (or synthetic) definition is current and points at the intended environment.
- Logging/tracing fields for new features are documented (field name, PII status, retention policy).

### Provenance & Evidence

- Release metadata (`docs/release/release-metadata.schema.yaml/json`) validated for the candidate.
- Evidence bundle or pointer recorded in `COMPLIANCE_EVIDENCE_INDEX.md`.
- Gate outputs (CI logs, GA Gate run) archived with PR links for replayability.

### Documentation

- User-facing change notes captured in `CHANGELOG.md` under the Unreleased section.
- Runbook impact noted in `RUNBOOKS/` or linked operational docs.
- Known limitations and mitigation steps captured in `GA_PROMOTION_PLAN.md` or the PR description.

### Upgrade & Rollback

- Upgrade steps and rollback strategy documented (including data migrations if present).
- Backward compatibility risk callouts included in `GO_NO_GO_GATE.md`.
- Feature flags or config toggles for safe rollout are enumerated.

## Release Gates

Each PR targeting `main` must clear these gates before GA promotion:

1. **Documentation & Evidence**
   - Files required: `docs/release/MVP-4-GA-DoD.md`, `CHANGELOG.md` (Unreleased updated), `docs/release/release-metadata.schema.yaml/json`, `GA_PROMOTION_PLAN.md`, `GO_NO_GO_GATE.md`.
   - Evidence: link to latest GA Gate CI run + log of `scripts/ga-gate.sh`.

2. **Quality Checks (Fast Path for PRs)**
   - Run `scripts/ga-gate.sh --fast --ci` to validate docs, schemas, changelog note, and smoke (`npm run test:quick`).
   - CI "GA Gate" job must be green; failures are blocking until resolved or explicitly waived by DRI.

3. **Full Gate (Pre-merge or Release Cut)**
   - Run `scripts/ga-gate.sh --full` for lint + smoke + schema/doc verification.
   - If any gate is waived, capture the approver, reason, and compensating controls in the PR.

4. **Sign-offs**
   - Security: delegated owner listed in `CODEOWNERS` (or security council) signs off on secrets/CVE posture.
   - QA: validates test coverage notes and approves any deferrals.
   - Ops: confirms observability and rollback readiness.

## How to Run

```bash
# Fast PR safety net (default CI mode)
./scripts/ga-gate.sh --fast --ci

# Full local gate before tagging a release candidate
./scripts/ga-gate.sh --full
```

The script prints a consolidated report of missing artifacts and failed checks. Use `--help` to view all options.
