# Summit v0.1.0 — Operator Readiness

## What it is
A production-hardened, Docker-based deployment of Summit's core + app layers with pinned images, health-gated startup, and Day-2 automations.

## Supported footprint
- Single host (Docker/Compose v2.19+) — Linux (x86_64/arm64)
- Optional observability bundle (Prometheus/Grafana/Alertmanager)

## Ports (host)
- Postgres: 15432
- Redis: 16379
- Neo4j: 17474 (HTTP), 17687 (Bolt)
- Adminer: 18080
- API: 18081
- Web: 18082

## Install (cold start)
```bash
git clone <repo> && cd summit-release-v0.1.0
cp .env.example .env  # adjust secrets/ports as needed
make up && make verify          # core
make app && make smoke          # app
```

## Health & Observability

* Health endpoints: `/health` on API/Web
* Alerts: API down / 5xx error-rate SLO
* Dashboards: Grafana (if enabled)

## Security & Compliance

* Images pinned by digest; no-new-privs; read-only FS (where possible); dropped Linux caps
* Non-root containers; secrets via environment; no secrets in images
* SBOMs available per release; optional cosign verification

## Backup/Restore

* Built-in `make dr-drill` (monthly recommended)
* Named volumes for DBs; export/restore scripts included

## SLOs

* API availability ≥ 99.9% monthly
* API 5xx ratio < 1% monthly
* RPO/RTO: per customer policy; reference DR drill timings

## Support & Security

* Support: see SUPPORT.md
* Vulnerability disclosure: SECURITY.md (48h acknowledge, 30-day patch window)
## Customer Acceptance Checklist (sign-off)
- [ ] Installed with pinned digests; health checks pass
- [ ] Alerts wired (API down, 5xx SLO) and fire in test
- [ ] DR drill completed (RTO <= 10m) with evidence
- [ ] Operator accounts + support channel verified
- [ ] Runbook bookmarked (OPS_TLDR.md) and on-call aware
