# Internal Migration Communication Plan (v0.1.0 → v2.0.0)

## Objectives

- Give every deployment owner a clear, time-bound upgrade path with rollback.
- Provide repeatable automation (scripts/migration/upgrade-v0.1-to-v2.0.sh) and examples for teams without helm pipelines.
- Capture evidence (health checks, smoke results, migration reports) for governance and audit.

## Audience & Channels

- **Core engineering**: Slack #release-train, weekly eng leads sync.
- **SRE/on-call**: PagerDuty handoff note + Slack #ops-alarms.
- **Customer success / field**: Email digest + Confluence page update with FAQ.
- **Security/compliance**: Slack #trust-and-safety with SBOM/attestation pointers.

## Timeline

- **T-3 days**: Announce freeze window and share quickstart automation command.
- **T-1 day**: Confirm backups complete and dry-run status (stage RC green + whitepaper gate passing).
- **T-day**: Execute wave 1 (canary tenants) using automation; wave 2 after SLO and error-budget checks clear.
- **T+1 day**: Collect metrics, publish migration reports, and confirm no regressions.

## Runbook (per environment)

1. **Prep**
   - `RELEASE_TAG=v2.0.0 NAMESPACE=<env> bash scripts/migration/upgrade-v0.1-to-v2.0.sh`
   - Capture `migration-report-*.md` artifact and attach to channel recap.
2. **Validation**
   - `make smoke` and targeted business flows (investigation create, narrative sim, document ingest).
   - Grafana dashboards: error rate <1%, p95 <500ms, cache hit rate >70%.
3. **Rollback**
   - `helm rollback summit --namespace <env>` if health or SLO checks fail.
   - Restore env backup from the report (`ENV_FILE.bak.*`).

## Messaging Templates

- **Slack (T-3 announcement)**
  - "Heads up: Summit v2.0.0 upgrade is scheduled for <date>. Prep via `bash scripts/migration/upgrade-v0.1-to-v2.0.sh` (uses make db:backup + helm upgrade). Expect ~2h window."
- **Email digest (field-facing)**
  - Summary of changes (caching, telemetry, security), expected downtime, validation steps, rollback contact.
- **Post-upgrade recap**
  - Include release candidate version, smoke results, Grafana screenshot link, and migration report filename.

## Approval & Governance

- Required checkboxes: backups captured, smoke tests green, GA whitepaper validation passing in release-train run.
- Approvers: Release Captain + SRE on-call + Security duty officer.
- Evidence store: attach migration reports and RC release notes to Confluence release page.

## Dependencies & Owners

- **Automation**: scripts/migration/upgrade-v0.1-to-v2.0.sh (owner: Release Engineering).
- **CI gate**: validate-whitepaper job in release-train (owner: DevX).
- **Dashboards**: Grafana SLO + cache hit dashboards (owner: Observability).
