# Maestro Go‑Live Readiness & Cutover Plan (Core Build Platform)

**Owner:** <PM/TPM Name>
**Go‑Live Target:** <Date>
**Scope:** Make Maestro the authoritative, mission‑critical CI/CD & build platform across all repos/services. Replace legacy pipelines with parity or better.
**Out of Scope:** Non‑prod experiments, optional plugins, non‑blocking analytics.

---

## 1) Executive Snapshot

- Why now: Consolidate build paths, reduce toil/cost, unify policy & observability, and standardize deployment.
- Definition of Done: Tier‑0/Tier‑1 services build on Maestro by default; rollback path exists; SLOs green for 2 weeks; audit & security sign‑offs complete.
- Cutover Mode: Phased waves with canary repos, then fan‑out by portfolio.

---

## 2) Go/No‑Go Gate Matrix (how to verify)

### A) Platform Reliability & Scale

- Scale test executors to expected p95 concurrency ×1.5
  - Run: `k6 run scripts/load-testing/k6-load-tests.js`
  - Accept: SLO dashboards green; autoscaling events visible.
- Resilience drills (cancel/retry/agent loss/registry brownouts)
  - Run: `scripts/witness.sh` (deployment evidence) + chaos scripts
  - Accept: graceful degradation; retries succeed; no data loss.
- Job success rate ≥ target over last 7 days
  - Run: Grafana dashboard (build success rate); PromQL
- Queue wait p95 ≤ threshold
  - Run: Grafana panel; PromQL on queue metrics

### B) Observability & SLOs

- Unified telemetry wired: OTEL traces, Prometheus metrics, structured logs
  - Files: `server/src/monitoring/*`, ServiceMonitor templates under `charts/maestro`
- SLO dashboards + paging policy
  - Files: `infra/k8s/monitoring/*`, Alertmanager PD route in `deploy/alertmanager/alertmanager.yaml`
- Cost guardrails
  - Dashboards for build duration, executor saturation; budgets via Grafana alerts

### C) Security, Governance & Compliance

- SSO/OIDC + RBAC enforced
  - CD renders `infra/k8s/auth/oidc-auth.tmpl.yaml` using repo secrets/vars
- Policy‑as‑code gates
  - Gatekeeper constraints: `required-imagedigest`, `disallow-latest`, `required-limits`, `required-annotations-values`
- Secrets hygiene
  - External Secrets template: `deploy/external-secrets/maestro-secrets.yaml`
- Supply‑chain (cosign, SBOM)
  - CD: cosign sign+verify (hard‑fail). Admission: Kyverno verify (keyless). Required annotations: `intelgraph.dev/signed=true`, `intelgraph.dev/sbom=spdx`.
- Audit
  - Witness artifact produced each deploy; CI logs; retention policies in monitoring config

### D) Deployment, Environments & IaC

- Dev → stage → prod via Argo Rollouts + SLO analysis
- IaC baselines in `charts/`, `deploy/`, `infra/k8s/`
- Schema/config gates via CI (OpenAPI lint, TODO guard, pinning guard)

### E) Disaster Recovery / Business Continuity

- Backups/restore: database & config scripts; DR jobs under `deploy/cron/`
- Chaos drills: runner kill, broker loss; verify playbooks in docs/runbooks

### F) Migration & Parity

- Inventory pipelines (Jira CSVs under docs/maestro)
- Golden builds reproducibility via witness + release artifacts

### G) Integrations

- SCM, GHCR, Jira, Slack wired in workflows
- External scanners invoked in security workflows (see `.github/workflows/*`)

### H) People, Enablement & Process

- Runbooks: `docs/runbooks/*`, `infra/runbooks/maestro-runbooks.yaml`
- RACI: see docs tables; training via MAESTRO_ONECLICK.md and templates

Go/No‑Go sign‑off: Security □ SRE □ Platform □ App Eng □ Compliance/Legal □ Exec Sponsor □

---

## 3) Cutover Plan (Timeline)

- T‑14d: finalize gate owners/targets; shadow builds on Maestro; DR rehearsal
- T‑7d: canary promote (10–20% repos); training & on‑call; peak‑like validation
- T‑2d: config snapshot; security & compliance review; announce freeze
- T‑0: flip Wave‑1; smoke; SLO monitoring; legacy warm standby; rollback criteria
- T+1→14: hypercare; next waves when green ≥48h; retro

---

## 4) Smoke Test Suite

- Build caching, secrets fetch, artifact publish + SBOM attach, vuln gates, staging deploy, e2e, promotion gate
- Negative tests: cancel mid‑job; kill runner; registry outage; deny egress; rotate secrets mid‑run

---

## 5) Rollback Playbook

- Triggers: job success < target; queue p95 breach; CVE; audit failure
- Steps: freeze; re‑point to legacy; promote last known‑good; export logs; incident; exec update; re‑cut plan

---

## 6) Migration Workbook (template)

| Team/Repo | Tier | Owner  | Pipeline Size | Critical Deps         | Scanners  | Avg Build (min) | Shadow Pass % | Blocking Issues | Cutover Wave |
| --------- | ---- | ------ | ------------- | --------------------- | --------- | --------------: | ------------: | --------------- | ------------ |
| <svc‑api> | 0    | <name> | 12 jobs       | vault://prod, ghcr.io | SAST+DAST |            14.2 |           98% | flaky test pack | Wave‑1       |

---

## 7) SLOs, KPIs & Alerts

- Queue wait p95, success rate, mean build duration, flake rate, MTTD/MTTR, cost/build; alert policy thresholds defined in Grafana/Alertmanager

---

## 8) Open Risks & Mitigations

- Concurrency bursts → autoscale + priority classes
- Plugin/runner compatibility → certified list + pre‑flight
- Secrets sprawl → centralize; scanning on PRs; deny unapproved env vars
- Cost spikes → budgets/quotas; archival policy
- Adoption → templates, best‑practice samples, office hours
- Unknowns → chaos drills; fast rollback

---

## 9) RACI (Sign‑Off)

| Activity          | R            | A            | C                   | I            |
| ----------------- | ------------ | ------------ | ------------------- | ------------ |
| Gate verification | Platform SRE | Head of Eng  | Security, App Leads | All          |
| Security review   | Security Eng | CISO         | Platform, Legal     | Team Leads   |
| DR drill          | Platform SRE | SRE Lead     | App Leads           | Exec Sponsor |
| Cutover comms     | PM/TPM       | Eng Director | Support, Comms      | All          |

---

## 10) Appendices

- Config checklist: runners, queues, autoscaling, network policies, artifact TTLs, PR rules
- Access & permissions: runner identities, repo/Org permissions, secrets ACLs
- Runbooks: perf regression, backlog, authz drift, cost spike, outage triage
- Contacts: on‑call rotations, escalation tree, vendor support

---

## Quick Commands (One‑Click)

- Staging:

```
make oneclick-staging TAG=<git-or-image-tag>
# or
make oneclick-staging IMMUTABLE_REF=ghcr.io/brianclong/maestro-control-plane@sha256:...
```

- Production:

```
make oneclick-prod TAG=<git-or-image-tag>
# or
make oneclick-prod IMMUTABLE_REF=ghcr.io/brianclong/maestro-control-plane@sha256:...
```

- Safe CD dry‑run:

```
gh workflow run cd.yml -f no_op=true --ref main
```

- Auto‑pin + staged deploy:

```
gh workflow run auto-pin-and-deploy.yml -f dry_run_first=true --ref main
# finalize
gh workflow run auto-pin-and-deploy.yml -f dry_run_first=false --ref main
```
