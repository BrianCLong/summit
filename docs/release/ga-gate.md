# Summit GA Gate

This checklist is the single canonical definition of what must be true for Summit to enter GA. Each line indicates whether it is validated automatically by `scripts/run-ga-gate.ts` or requires manual sign-off. Manual items must be documented in the evidence log and linked to a tracking issue.

## Engineering

- [ ] **All CI checks passing** — automated via `ci_pass` (github check).
- [ ] **TypeScript strict mode enabled** — automated via `typescript_strict` (static check).
- [ ] **No `@ts-ignore` without tracking issue reference** — automated via `ts_ignore_tracking` (pattern scan).
- [ ] **Lint, test, and build all green** — automated as part of CI `lint_test_build`; GA gate expects these jobs to be part of the pipeline.

## Security

- [ ] **Secrets scanning enabled** — manual confirmation required; attach latest scan output or waiver.
- [ ] **Dependency vulnerability scan passes (or explicitly waived with justification)** — manual confirmation required; include SBOM/vulnerability report.
- [ ] **AuthN/AuthZ paths documented** — automated presence check for `docs/security/AUTH_MATRIX.md` and `docs/security/service-to-service-auth.md`.
- [ ] **Error taxonomy enforced in core paths** — manual confirmation that taxonomy is applied in critical services.

## Governance

- [ ] **CODEOWNERS enforced** — manual verification against repository settings.
- [ ] **Branch protections verified** — manual verification of required checks and review rules on `main` and `release/*`.
- [ ] **Agent permission tiers respected** — manual sign-off that automation obeys defined roles.
- [ ] **Audit logging enabled for CI + agents** — manual confirmation with links to logging backends or evidence bundles.

## Observability

- [ ] **Metrics exposed for ingestion, retrieval, RAG** — manual confirmation referencing metrics catalog.
- [ ] **Error classes mapped to metrics** — manual confirmation that error taxonomy is bound to metrics and alerts.
- [ ] **At least one Grafana-ready dashboard definition** — automated filesystem check for `grafana/dashboards` content.

## Documentation

- [ ] **Architecture overview exists** — automated by checking `docs/architecture` presence.
- [ ] **API surfaces documented** — manual confirmation referencing API docs.
- [ ] **Contribution + governance docs complete** — automated presence check for `docs/governance`.

## Running the Gate

Use `pnpm exec tsx scripts/run-ga-gate.ts` (or `node dist/scripts/run-ga-gate.js` if compiled) from repo root. Results are printed to stdout and written to `/artifacts/ga-gate-report.json`.

## Evidence Expectations

- Automated checks record status in the JSON artifact.
- Manual items must be backed by links to reports, dashboards, or signed approvals recorded in `docs/audit/ga-evidence.md`.
- Overrides require a tracking issue and approval from governance leads.
