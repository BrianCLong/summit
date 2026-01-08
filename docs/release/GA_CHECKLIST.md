# GA Launch Checklist (Summit / IntelGraph)

This checklist is the operator-ready runbook for declaring GA. Execute steps in order and record evidence in `docs/release/GA_EVIDENCE_INDEX.md`.

## Preconditions

- `.env` present (copy from `.env.example`) with production values for API/DB/Redis/Neo4j secrets.
- Docker Engine and Compose v2 available (`make dev-prereqs` validates).
- CI configuration mirrors `Makefile` golden path; run from repo root.

## Build & Verification Pipeline

1. **Bootstrap toolchain**: `make bootstrap`
2. **Static analysis**: `npm run lint:strict` (ESLint + Ruff)
3. **Type safety**: `npm run typecheck`
4. **Unit tests**: `npm run test:unit`
5. **Integration tests**: `npm run test:integration`
6. **E2E/UI accessibility**: `npm run test:e2e` and `npm run test:a11y-gate`
7. **Security baseline**: `npm run security:check` and `npm run generate:sbom`
8. **Governance checks**: `npm run verify:governance` and `npm run verify:living-documents`
9. **Full CI parity**: `make ci` (mirrors lint + tests) then `make smoke`

## Runtime Sanity

1. Start stack: `make dev-up`
2. Health probes: `curl -f http://localhost:8080/healthz` and `curl -f http://localhost:3000`
3. Smoke flows: run `make dev-smoke` followed by `smoke-test.js` if browser automation is configured.
4. Observability: confirm structured logs present and `/metrics` exposes Prometheus registry without duplicate errors.

## Data & Migration Safety

- Apply Postgres/Neo4j migrations in order using `npm run db:migrate` and `npm run db:neo4j:migrate`.
- Verify rollback path: `make rollback v=<previous_version> env=<staging|prod>`.
- Capture backups: `npm run backup` prior to production cutover.

## Deployment Packaging

- Build artifacts: `npm run build` or `make release` (Docker + Python wheel) with IMAGE_TAG aligned to `package.json` version.
- Verify SBOM output at `sbom.json` and provenance via `npm run generate:provenance` if enabled.
- Publish candidate images to staging registry (do not tag `latest` until go-live approval).

## Post-Deployment Verification

- Run `scripts/health-check.sh` against deployed environment.
- Confirm feature flags match `ga-release-process.md` matrix.
- Validate SLO dashboards against `slo-config.yaml`; confirm alerting policies in `ALERT_POLICIES.yaml` are green.

## Sign-off

## Security Exceptions
- [ ] Review the `security-exceptions-report.md` artifact from the CI build.
- [ ] Verify that there are no invalid, expired, or unapproved critical exceptions for this release.
- [ ] Acknowledge any active exceptions in the release notes.

- Product, Security, and SRE leads sign GA in `GA_READINESS_REPORT.md`.
- Update `docs/roadmap/STATUS.json` with completion evidence and mark epics ready.
