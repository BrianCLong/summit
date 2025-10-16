````markdown
---
slug: sprint-2025-09-29-bravo-issues
version: v2025.09.29-b2
parent_slug: sprint-2025-09-29-bravo
summary: GitHub issues, labels, templates, project board automation, and CLI scaffolds for Sprint 24
---

# Sprint 24 — Issue Pack & Automation

This package creates all sprint artifacts in GitHub: labels, milestones, project board, issue templates, CODEOWNERS, and CI helpers. Copy files to repo root and run the CLI section to instantiate issues.

---

## 1) Labels (apply first)

```yaml
# .github/labels.yml (use `gh label create -f` or a sync action)
- name: epic
  color: BFD4F2
  description: Cross-cutting initiative
- name: ci/cd
  color: 0366D6
  description: Pipelines & automation
- name: deploy
  color: 0E8A16
  description: Helm/rollouts/infra
- name: observability
  color: 1D76DB
  description: OTEL/metrics/logs
- name: security
  color: B60205
  description: SAST/SCA/secrets
- name: dr-resilience
  color: 5319E7
  description: Backups/replicas/failover
- name: arborist
  color: 6A737D
  description: Repo hygiene
- name: migration-gate
  color: E99695
  description: Schema change controls
- name: feature-flag
  color: FEF2C0
  description: Flagging & defaults
- name: risk
  color: D93F0B
  description: Elevated risk or rollback pathway
- name: blocked
  color: 000000
  description: Waiting on external/unresolved
- name: needs-triage
  color: FEF2C0
  description: Triage required
```
````

---

## 2) Project Board & Swimlanes

Create a **v2025.09.29 Sprint 24** project (user/org-level). Columns:

1. **Backlog** → default
2. **Ready**
3. **In Progress**
4. **In Review**
5. **Ready for Canary**
6. **Canary**
7. **Soak**
8. **Done**
9. **Blocked** (triage weekly)

Automation rules (via action below):

- Add `blocked` label ⇒ move to **Blocked**
- PR opened & linked ⇒ **In Review**
- `deploy` + `canary` labels ⇒ **Ready for Canary**
- Canary job success ⇒ **Canary**; completed soak (24–48h) ⇒ **Done**

---

## 3) Issue Templates

### 3.1 Bug Report

```markdown
---
name: Bug report
about: Create a report to help us improve
labels: needs-triage
---

### Summary

### Repro

1.

### Expected

### Actual

### Evidence

- logs:
- traces:
- metrics:

### Impact

- users affected:
- SLO impact:

### Mitigation/Workaround

### Owner & Links

- service:
- runbook:
```

### 3.2 Tech Debt

```markdown
---
name: Tech debt
about: Reliability/maintainability improvement
labels: arborist
---

### Problem

### Proposal

### Risks & Rollback

### Observability Additions

- metrics:
- traces:
- logs:
```

### 3.3 Change Request (Canary Required)

```markdown
---
name: Change request
about: Feature/config change that must canary
labels: deploy, risk
---

### Change Description

### Canary Plan

- steps: 10→30→60→100
- guardrails: error-rate, p95

### Rollback Plan

### Migration Gate (if schema)

- artifacts: up.sql/down.sql + checksum

### Verification

- smoke:
- golden signals:
```

---

## 4) CODEOWNERS (refresh)

```txt
# .github/CODEOWNERS
/charts/**                  @platform-team
/infra/**                   @platform-team
/.github/workflows/**       @cicd-team
/services/gateway/**        @backend-team @platform-team
/services/ingest/**         @backend-team
/services/docs-api/**       @backend-team
/ops/migrations/**          @db-team @platform-team
```

---

## 5) Branch Protections (policy)

- Require PR reviews (2 for critical paths), disallow force-push, linear history.
- Required checks: lint, unit, e2e, sbom, sast/sca, container-scan, helm-lint, infra-plan, migrations-gate.
- Dismiss stale approvals on update; restrict admin bypass.

---

## 6) Workflow Automation

### 6.1 Move cards on events

```yaml
# .github/workflows/project-auto.yml
name: project-automation
on:
  issues:
    types: [labeled, unlabeled, opened, closed]
  pull_request:
    types: [opened, ready_for_review, closed]
permissions:
  issues: write
  pull-requests: write
  contents: read
  project: write
jobs:
  route:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const core = require('@actions/core');
            const github = require('@actions/github');
            const ctx = github.context;
            const labelNames = (ctx.payload.issue?.labels||ctx.payload.pull_request?.labels||[]).map(l=>l.name);
            // pseudo route; insert your project id/status field if using Projects v2
            core.info(`Event: ${ctx.eventName} labels=${labelNames}`);
```

> Note: If using **Projects v2**, set `ORG`, `PROJECT_NUMBER`, and `STATUS_FIELD` secrets and extend the script to set status accordingly.

---

## 7) Issue Backlog — Ready to Create

Map of issues derived from the sprint plan. Each has acceptance, test, and logging/tracing hooks.

### EPIC-1: Progressive Delivery & Rollback (`epic`, `deploy`)

- **HELM-101** — Canary strategy in `charts/app/values.yaml`
  - AC: traffic 10/30/60/100; guardrails queries present; helm lint passes.
  - Tests: dry-run + unit helm tests.
- **HELM-102** — Probes on all Deployments
  - AC: readiness & liveness probes everywhere; Gatekeeper passes.
- **ROLL-103** — Auto-rollback on burn alert
  - AC: rollback job flips to previous release on alert labeled `canary-breach`.

### EPIC-2: Preview Environments (`epic`, `ci/cd`)

- **PREV-201** — Namespace-per-PR workflow; TTL teardown
- **PREV-202** — Ephemeral Postgres masked fixtures Job
- **PREV-203** — Public URL `pr-<N>.stage.example.com`

### EPIC-3: Observability Baseline (`epic`, `observability`)

- **OTEL-301** — `traceparent` propagation gateway→services→DB
- **OTEL-302** — RED dashboards per service in Grafana
- **OTEL-303** — Burn-rate alerts 2×/10× (5m/1h)

### EPIC-4: Security & Compliance (`epic`, `security`)

- **SEC-401** — SBOM attest & upload; block on criticals
- **SEC-402** — gitleaks pre-commit & CI
- **SEC-403** — OPA policies: disallow `:latest`, require resources & probes

### EPIC-5: DR & Resilience (`epic`, `dr-resilience`)

- **DR-501** — Stage failover simulation via Route53
- **DR-502** — PITR verification with timestamped restore

---

## 8) CLI Scaffolds — Create Milestone, Project, and Issues

> Requires GitHub CLI (`gh`) authenticated and repo set as current directory.

```bash
# 8.1 Milestone
MILESTONE="Sprint 24 — 2025-09-29 → 2025-10-10"
gh milestone create "$MILESTONE" -d "Progressive delivery, observability, DR drill" || true

# 8.2 Labels (idempotent)
cat .github/labels.yml | yq -r '.[] | "\(.name)\t\(.color)\t\(.description)"' | while IFS=$'\t' read -r name color desc; do
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || gh label edit "$name" --color "$color" --description "$desc"
done

# 8.3 Issues (lightweight)
new_issue(){
  local title="$1"; shift
  gh issue create --title "$title" --milestone "$MILESTONE" --label "$@"
}

new_issue "EPIC-1: Progressive Delivery & Rollback" epic deploy
new_issue "HELM-101: Add canary strategy to charts/app" deploy
new_issue "HELM-102: Add probes to all Deployments" deploy
new_issue "ROLL-103: Auto-rollback on burn alert" deploy risk

new_issue "EPIC-2: Preview Environments" epic ci/cd
new_issue "PREV-201: Namespace-per-PR + TTL" ci/cd
new_issue "PREV-202: Ephemeral Postgres fixtures" ci/cd
new_issue "PREV-203: PR public URL routing" ci/cd

new_issue "EPIC-3: Observability Baseline" epic observability
new_issue "OTEL-301: Propagate traceparent" observability
new_issue "OTEL-302: RED dashboards per service" observability
new_issue "OTEL-303: Burn-rate alerts" observability

new_issue "EPIC-4: Security & Compliance Gates" epic security
new_issue "SEC-401: SBOM attest & block criticals" security
new_issue "SEC-402: gitleaks pre-commit + CI" security
new_issue "SEC-403: OPA policies for probes/resources/no-latest" security

new_issue "EPIC-5: DR & Resilience" epic dr-resilience
new_issue "DR-501: Stage failover simulation" dr-resilience deploy
new_issue "DR-502: PITR verification" dr-resilience
```

---

## 9) Release Notes Template (attach at cut)

```markdown
# Release v2025.09.29-b1

## Highlights

- Progressive delivery canaries with auto-rollback
- Observability baseline (OTEL + RED + burn alerts)
- Security gates (SBOM, gitleaks, OPA)
- DR drill with RTO/RPO evidence

## Changes by Area

- CI/CD:
- Deploy:
- Observability:
- Security:
- DR:

## Ops Notes

- Feature flags/rollout plan:
- Backward compatibility:
- Migration notes:

## Evidence

- Dashboards:
- Audit entries:
- DR timestamps:
```

---

## 10) Acceptance Checklists (clip into issues)

### Canary & Rollback

- [ ] Canary values.yaml merged
- [ ] Metrics queries validated in Prometheus
- [ ] Rollback job tested on fake breach

### Preview Environments

- [ ] Namespace created/destroyed on PR open/close
- [ ] Postgres fixtures loaded automatically
- [ ] Public URL reachable; auth masked

### Observability

- [ ] `traceparent` continuity ≥ 80%
- [ ] p95 < 1.5s for key paths in stage
- [ ] Burn-rate alerts firing in test

### Security

- [ ] SBOM uploaded for all images
- [ ] No CRITICAL vulns at cut
- [ ] OPA constraints enforced cluster-wide

### DR

- [ ] Route53 health check swaps
- [ ] PITR restore validated with checksum

```

```
