# Topicality — Workflow Alignment: Execution Order + GitHub Runbook (Oct–Nov 2025)

**Date:** 2025-10-03 (America/Chicago)

---

## 0) Decision-First Summary (two-week value slice ready now)

**Context.** Cadence spans **Sep 29–Nov 13** across Maestro-Conductor (16 sprints), Aurelius-AI (11), Intelgraph-Core (11), Durga-Directorate (10), Documentation (6), Summit-Program (6). Monitoring gaps (error budgets), data freshness (ML gates), and release blind spots (metrics exporter) create avoidable risk.

**Decisions.**
1. **Re-enable error-budget monitoring** and wire to real Prometheus queries before **Oct 20**.
2. **Ship Metrics Exporter MVP** for Maestro-Conductor by **Oct 10**, used by Summit-Program & wiki dashboard.
3. **Stand up cross-workstream roadmap + GitHub Project** and seed from CSV tracker by **Oct 07**.
4. **Schedule dependency sync** (Maestro, Policy/Durga, Intelgraph) for **Oct 08** and weekly thereafter.
5. **Unblock ML data freshness**: labeling/import pipeline cutover by **Oct 20**.

**Owners (proposed).**
- **MC (Maestro-Conductor):** *Owner:* A. Patel — backup: R. Chen.
- **AAI (Aurelius-AI):** *Owner:* L. Rivera — backup: M. Zhou.
- **IGC (Intelgraph-Core):** *Owner:* D. Kim — backup: J. Park.
- **DD (Durga-Directorate/Policy):** *Owner:* S. Natarajan — backup: T. Wolfe.
- **Docs/Summit:** *Owner:* E. Garcia — backup: K. Singh.

**Proof-by dates.** See Section 1.

---

## 1) Execution Orders (who/what/when/DoD)

### EO-1 — Enable Error Budget Workflow & Wire Prometheus
- **Owner:** S. Natarajan (DD)  
- **Due:** **2025-10-20**  
- **What:** Turn `error-budget-monitoring.yml` from disabled to enforced, add PromQL for `availability_slo` & `mttc` proxies, and register SLO budgets in wiki.
- **Definition of Done:**
  - Workflow enabled on default branch; scheduled **every 15m** and on demand.
  - Failing SLO opens a **P1 issue** with assignee and `auto-escalate` label; Slack webhook notifies `#ops`.
  - Dashboard tile “SLO: Error Budget Burn (30d)” visible in engineering wiki and updates hourly.

### EO-2 — Metrics Exporter MVP for Maestro-Conductor
- **Owner:** A. Patel (MC)  
- **Due:** **2025-10-10**  
- **What:** Replace stub in `metrics-export.yml` with real exporter: emits `run_id, service, status, p95_ms, error_rate, cost_per_run` to S3/GCS or GH Pages artifact; publish as dataset for Summit-Program.
- **Definition of Done:**
  - GitHub Action green on `main` and nightly; artifact contains latest runs.
  - Wiki chart reads latest dataset; **smoke-compose** workflow linked in row.
  - Canary flag for Maestro releases uses exporter metrics.

### EO-3 — Create Cross-Workstream Roadmap Issue & Project Board
- **Owner:** E. Garcia (Docs/Summit)  
- **Due:** **2025-10-07**  
- **What:** One canonical roadmap issue + GitHub Project with columns `Intake → Sprint Ready → In Flight → Validation → Done`; seed from CSV tracker.
- **Definition of Done:**
  - Roadmap issue references sprint IDs and linked epics (AAI, MC, DD, IGC).
  - Project auto-updates from labels and milestone events; burnup visible.
  - Weekly cadence doc links to latest workflow runs and outcomes.

### EO-4 — Cross-Workstream Dependency Sync Ceremony
- **Owner:** R. Chen (MC)  
- **Due:** **Kickoff 2025-10-08**, recur **Wednesdays 09:30–10:00 CT**  
- **What:** Standing 30-min sync to align releases (Maestro ↔ Policy ↔ Intelgraph), surface blockers, decide two-way doors quickly.
- **Definition of DoD:** Agenda + notes in wiki; decision log with owners & dates; action items flow into Project.

### EO-5 — ML Data Freshness & Labeling Sprint
- **Owner:** L. Rivera (AAI)  
- **Due:** **2025-10-20**  
- **What:** Refresh fixtures → sampled production-like data; run ER precision gate on refreshed set; publish model card & dashboard.
- **Definition of Done:**
  - `er-precision-gate.yml` passes on refreshed data ≥ target precision; model card committed.
  - “Model Performance” dashboard live; link added to wiki & Project.

---

## 2) GitHub CLI Runbook (copy/paste)
> You’ll need a repo admin or a temporary maintainer token with `repo`, `actions`, `project`, and `admin:org_hook` as applicable. Replace placeholders in ALL_CAPS.

### 2.1 — Enable Error Budget Workflow
```bash
# 1) Remove "if: false" guard and commit
BRANCH=chore/enable-error-budget-2025-10-03
FILE=.github/workflows/error-budget-monitoring.yml
gh repo clone ORG/REPO
cd REPO
git checkout -b "$BRANCH"
sed -i.bak 's/^\s*if:\s*false\s*$//g' "$FILE"

# 2) Inject schedule & dispatch if missing
awk '1; /on:/ {print "  schedule:\n    - cron: \"*/15 * * * *\"\n  workflow_dispatch:"; exit}' "$FILE" > tmp && mv tmp "$FILE"

# 3) Add required secrets (Prometheus + Slack)
# Create or update: PROM_URL, PROM_BASIC_AUTH, SLACK_WEBHOOK
gh secret set PROM_URL --body "https://prometheus.example.com"
gh secret set PROM_BASIC_AUTH --body "user:pass"
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/..."

# 4) Commit & PR
git add "$FILE"
git commit -m "chore(ops): enable error budget monitoring w/ schedule"
git push -u origin "$BRANCH"
gh pr create --title "Enable Error Budget Monitoring" --body "Turns on schedule + alerts; opens P1 on burn."
```

**PromQL skeletons** (drop into the workflow step):
```yaml
- name: Query Prometheus SLOs
  run: |
    curl -s -u "$PROM_BASIC_AUTH" "$PROM_URL/api/v1/query?query=1 - (sum(rate(http_request_errors_total[30d])) / sum(rate(http_requests_total[30d])))" > slo_availability.json
    curl -s -u "$PROM_BASIC_AUTH" "$PROM_URL/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" > p95.json
```

### 2.2 — Metrics Exporter MVP (replace stub)
Create `.github/workflows/metrics-export.yml` content:
```yaml
name: metrics-export
on:
  schedule:
    - cron: "0 * * * *"
  workflow_dispatch:
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Collect workflow run stats
        id: collect
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRunsForRepo({ owner: context.repo.owner, repo: context.repo.repo, per_page: 100 });
            const rows = runs.data.workflow_runs.map(r => ({
              run_id: r.id,
              workflow: r.name,
              status: r.conclusion || r.status,
              started_at: r.run_started_at,
              duration_s: (new Date(r.updated_at) - new Date(r.run_started_at))/1000,
            }));
            core.setOutput('json', JSON.stringify(rows));
      - name: Emit CSV
        run: |
          node -e 'const rows=JSON.parse(process.env.JSON); const fs=require("fs"); const h=Object.keys(rows[0]||{run_id:"",workflow:"",status:"",started_at:"",duration_s:""}); console.log(h.join(",")); rows.forEach(r=>console.log(h.map(k=>r[k]).join(",")))' > metrics.csv
        env:
          JSON: ${{ steps.collect.outputs.json }}
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: workflow-metrics
          path: metrics.csv
```

### 2.3 — Project Board + Issues from CSV
Assumes tracker file: `project_management/october2025_sprint_tracker.csv` with headers: `workstream,title,assignee,label,milestone,link`.
```bash
# Create project (org-level or repo-level)
PROJECT_NAME="Oct–Nov 2025 Delivery"
gh project create --title "$PROJECT_NAME" --format json > project.json
PROJECT_ID=$(jq -r .id project.json)

# Create columns (views handled by new projects; we’ll use status field via fields API)
# Add a custom field Status: Intake, Sprint Ready, In Flight, Validation, Done
# (Use UI once; or API if enabled)

# Seed issues per CSV
while IFS=, read -r workstream title assignee label milestone link; do
  BODY="Workstream: ${workstream}
Linked: ${link}"
  ISSUE=$(gh issue create --title "$title" --assignee "$assignee" --label "$label,$workstream" --milestone "$milestone" --body "$BODY" --json number,id)
  NUMBER=$(echo "$ISSUE" | jq -r .number)
  gh project item-add --project "$PROJECT_ID" --url "$(gh issue view $NUMBER --json url -q .url)"
done < project_management/october2025_sprint_tracker.csv
```

**Epic scaffolds** (run once per workstream):
```bash
for WS in Aurelius-AI Maestro-Conductor Durga-Directorate Intelgraph-Core; do
  gh issue create \
    --title "[EPIC] ${WS} — Oct–Nov 2025" \
    --label epic,${WS} \
    --body "Scope: …\nTracker: project_management/october2025_sprint_tracker.csv\nExit: demo + metrics" \
    --milestone "Oct–Nov 2025"
done
```

### 2.4 — Playwright/Client CI (Intelgraph-Core)
Add `.github/workflows/client-e2e.yml`:
```yaml
name: client-e2e
on:
  pull_request:
  schedule:
    - cron: "0 */6 * * *"
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --reporter=junit
      - uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report }
```

### 2.5 — Policy/Drift CI Caching (Durga)
Patch `.github/workflows/rbac-drift.yml`:
```yaml
    - uses: actions/cache@v4
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
        restore-keys: ${{ runner.os }}-pip-
```

### 2.6 — Docs Nightly Build & Release Notes
`.github/workflows/docs-nightly.yml`:
```yaml
name: docs-nightly
on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci && npm run build:docs
      - name: Generate release notes
        run: npm run release:notes
      - uses: actions/upload-artifact@v4
        with: { name: docs, path: docs/dist }
```

---

## 3) Dashboard Spec (wiki embed)
**Tiles:**
1. **Tracker counts** by workstream (from CSV): sparkline over time.
2. **Workflow health**: success rate, last run, last failure.
3. **Risk status**: Monitoring/Data Freshness/Release Tooling/Docs/Dependencies — traffic lights with owner + next step.
4. **SLO Panel**: Error budget burn, p95 latency, MTTC (derived).

**Data sources:**
- `metrics-export` artifact CSV (Section 2.2).
- GitHub REST for workflow runs.
- Prometheus for SLOs (EO-1).
- Tracker CSV for counts.

**Update cadence:** hourly for workflows; nightly for docs.

---

## 4) Weekly Cadence Doc (template)
**When:** Fridays 15:00–15:30 CT  
**Attendees:** MC, AAI, IGC, DD, Docs/Summit owners  
**Links:** Project board view + last run dashboards  

**Agenda (25 min):**
1. Wins (2m)  
2. Risks by heat (5m)  
3. Blockers (10m)  
4. Decisions & Owners (5m)  
5. Next-week preview (3m)  

**Notes format:**
- Decision | Owner | Proof-by | Reversible? | Risk | Link

---

## 5) Risk Controls & Mitigations (map → controls)
- **Monitoring gaps** → EO-1 + alerting to P1 issue + Slack; monthly test fire-drill.
- **Data freshness (ML)** → EO-5; add `data_age_days` metric & gating threshold.
- **Release tooling** → EO-2; promotion gates read exporter metrics.
- **Documentation lag** → nightly docs + sprint cutoffs; each sprint has Docs owner.
- **Cross-workstream deps** → EO-4 ceremony; decision log to IntelGraph (when available).

---

## 6) Meeting Invite Text (copy/paste)
**Subject:** Topicality Cross-Workstream Sync (Maestro × Policy × Intelgraph)  
**When:** Wednesdays 09:30–10:00 CT, starting **Oct 8, 2025**  
**Where:** Zoom/Meet — link  
**Agenda:** Status, risks, blockers, decisions; confirm next release gates.  
**Pre-reads:** Project board, metrics dashboard, last Maestro release notes.

---

## 7) Notes on Access & Secrets
We cannot create tokens, secrets, or resources on your behalf. Use a least-privilege PAT or an ephemeral org token. After running commands, rotate or revoke the token. Required scopes: `repo`, `project`, `workflow`, `admin:repo_hook` (if needed). Store secrets in GitHub `Actions Secrets`.

---

## 8) Acceptance Checklist (sign-off)
- [ ] EO-1: Error budget alerts visible, P1 auto-issue opens on burn.
- [ ] EO-2: Metrics exporter artifact visible and consumed by dashboard.
- [ ] EO-3: Project board seeded; roadmap issue links to epics.
- [ ] EO-4: Weekly sync calendar + first minutes published.
- [ ] EO-5: ML gates green on refreshed data; model card merged.

---

## 9) Appendix — PromQL & Alert Routing Examples
**Burn rate alerts (multi-window):**
```yaml
- alert: ErrorBudgetBurn
  expr: |
    (sum(rate(http_request_errors_total[5m])) / sum(rate(http_requests_total[5m])))
      / (1 - SLO) > 14
  for: 2m
  labels: { severity: critical }
  annotations:
    summary: "Fast burn >14x"
```

**Slack/Issue bridge (GitHub Script step):**
```yaml
- name: Open P1 on violation
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `SLO breach: ${process.env.WF_NAME}`,
        body: 'Auto-opened by error-budget workflow',
        labels: ['P1','slo-breach']
      })
```

