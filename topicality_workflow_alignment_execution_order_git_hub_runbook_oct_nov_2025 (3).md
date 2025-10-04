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



---

## 10) Pre‑Drafted GitHub Issue Bodies (copy/paste)
> Use these as `--body-file` or paste into the web UI. Replace `ORG/REPO`, dates, and owner handles.

### 10.1 — Roadmap (Canonical) — Issue Body
**Title:** Roadmap — Oct–Nov 2025 Delivery (Cross‑Workstream)

**Context**
Cadence: Sep 29–Nov 13 across MC, AAI, IGC, DD, Docs, Summit. This is the single source of truth for phase gates and dependencies.

**Milestones**
1. Stabilization (now–Oct 10)
2. Scale‑out (Oct 13–24)
3. Launch Prep (Oct 27–Nov 7)
4. Post‑Launch Hardening (Nov 10 →)

**Execution Orders**
- EO‑1 Error Budget Monitoring — Owner @s-natarajan — Due Oct 20
- EO‑2 Metrics Exporter MVP — Owner @a-patel — Due Oct 10
- EO‑3 Roadmap + Project Board — Owner @e-garcia — Due Oct 7
- EO‑4 Dependency Sync — Owner @r-chen — Kickoff Oct 8, 09:30 CT
- EO‑5 ML Data Freshness — Owner @l-rivera — Due Oct 20

**Risks & Mitigations**
- Monitoring gaps → EO‑1 alerts + P1 auto‑issue
- Data freshness → EO‑5 labeling + dashboard
- Release tooling → EO‑2 exporter → canary gates
- Docs lag → nightly docs + sprint cutoffs
- Cross‑deps → weekly sync + decision log

**Acceptance Checklist**
- [ ] All EO DoD met (see linked issues)
- [ ] Dashboard tiles live in wiki
- [ ] Weekly notes linked for each Friday

**Links**
- Tracker: `project_management/october2025_sprint_tracker.csv`
- Workflows: see `.github/workflows/*`

/labels roadmap,program
/milestone "Oct–Nov 2025"

---

### 10.2 — EPIC Template — Issue Body
**Title:** [EPIC] <Workstream> — Oct–Nov 2025

**Problem / Goal**
What success looks like for this workstream this cycle.

**Scope**
- Key deliverables and bounds
- Non‑goals

**Plan**
- Milestones aligned to phases (Stabilization, Scale‑out, Launch Prep, Hardening)
- Test/validation strategy (smoke, CI gates, dashboards)

**Dependencies**
- Cross‑workstream contacts
- External systems/secrets

**Exit Criteria**
- Demo and metrics proving ROI

**Tracking**
- Tracker rows: `<IDs or links>`
- Project items: auto‑linked via labels `<workstream>, epic`

/labels epic,<workstream>
/milestone "Oct–Nov 2025"

---

### 10.3 — EO Task Issues — Bodies

#### EO‑1 — Enable Error Budget Workflow & Prometheus
**Objective**
Turn on error‑budget monitoring with actionable alerts and P1 auto‑issue on burn.

**Tasks**
- [ ] Remove `if: false` guard from `error-budget-monitoring.yml`
- [ ] Add schedule (*/15) + `workflow_dispatch`
- [ ] Wire Prometheus (`PROM_URL`, `PROM_BASIC_AUTH`) and Slack webhook
- [ ] Add PromQL for availability, p95, burn‑rate
- [ ] Add GitHub Script step to open P1 on failure
- [ ] Document SLOs in wiki and link panel

**DoD**
Workflow runs green; test breach opens P1 and posts to `#ops`; wiki panel live.

/labels ops,slo,priority‑p1
/assignees @s-natarajan
/milestone "Oct–Nov 2025"

---

#### EO‑2 — Metrics Exporter MVP (Maestro)
**Objective**
Replace stub exporter; publish hourly CSV artifact with run metrics.

**Tasks**
- [ ] Commit workflow from Runbook §2.2
- [ ] Verify artifact `workflow-metrics` with headers
- [ ] Add wiki chart reading latest artifact
- [ ] Gate Maestro canary on exporter metrics

**DoD**
Exporter artifact visible; wiki tile updates hourly; canary reads metrics.

/labels release,telemetry
/assignees @a-patel
/milestone "Oct–Nov 2025"

---

#### EO‑3 — Roadmap Issue & Project Board
**Objective**
Stand up canonical roadmap + Project; seed from CSV tracker.

**Tasks**
- [ ] Create Project “Oct–Nov 2025 Delivery”
- [ ] Add Status field: Intake → Sprint Ready → In Flight → Validation → Done
- [ ] Seed issues from CSV
- [ ] Create EPICs per workstream and link
- [ ] Add saved views (by workstream, by status, by week)

**DoD**
Project reflects tracker; burn‑up visible; roadmap issue links all epics.

/labels program,pm
/assignees @e-garcia
/milestone "Oct–Nov 2025"

---

#### EO‑4 — Cross‑Workstream Dependency Sync
**Objective**
Weekly 30‑min sync to align releases and surface blockers.

**Tasks**
- [ ] Schedule series Wednesdays 09:30–10:00 CT starting Oct 8
- [ ] Create running agenda/notes doc
- [ ] Capture decisions with owners and proof‑by dates
- [ ] Feed action items to Project

**DoD**
First session held; notes published; decisions logged.

/labels program,governance
/assignees @r-chen
/milestone "Oct–Nov 2025"

---

#### EO‑5 — ML Data Freshness & Labeling Sprint
**Objective**
Refresh fixtures, rerun precision gate, and publish model card & dashboard.

**Tasks**
- [ ] Pull fresh labeled sample; document `data_age_days`
- [ ] Rerun `er-precision-gate.yml` on refreshed set
- [ ] Add “Model Performance” dashboard to wiki
- [ ] Publish model card (target metrics, dataset hash)

**DoD**
Precision ≥ target on refreshed data; dashboard live; model card merged.

/labels ml,quality
/assignees @l-rivera
/milestone "Oct–Nov 2025"

---

## 11) Dashboard JSON Artifacts
> Option A: **Grafana** dashboard JSON (importable). Replace `DS_PROM` (Prometheus) and `DS_CSV` (CSV/Infinity) data sources.

```json
{
  "title": "Topicality — Ops & Delivery",
  "timezone": "browser",
  "panels": [
    {
      "type": "timeseries",
      "title": "Error Budget Burn (30d)",
      "datasource": { "type": "prometheus", "uid": "DS_PROM" },
      "targets": [{ "expr": "sum(rate(http_request_errors_total[5m])) / sum(rate(http_requests_total[5m]))" }]
    },
    {
      "type": "timeseries",
      "title": "p95 Latency",
      "datasource": { "type": "prometheus", "uid": "DS_PROM" },
      "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" }]
    },
    {
      "type": "stat",
      "title": "Workflow Success Rate (24h)",
      "datasource": { "type": "infinity", "uid": "DS_CSV" },
      "targets": [{
        "format": "csv",
        "url": "{{ARTIFACT_URL}}",
        "refId": "A"
      }]
    },
    {
      "type": "table",
      "title": "Recent Workflow Runs",
      "datasource": { "type": "infinity", "uid": "DS_CSV" },
      "targets": [{ "format": "csv", "url": "{{ARTIFACT_URL}}", "refId": "B" }]
    }
  ],
  "templating": { "list": [] }
}
```

> Option B: Lightweight **wiki embed** using CSV artifact. Drop this in a Markdown page rendered by a static JS include.

```html
<div id="wf"></div>
<script>
(async function(){
  const url = '{{ARTIFACT_URL}}';
  const csv = await (await fetch(url)).text();
  const rows = csv.trim().split('
').map(l=>l.split(','));
  const head = rows.shift();
  const byStatus = rows.reduce((a,r)=>{ const i=head.indexOf('status'); a[r[i]]=(a[r[i]]||0)+1; return a; },{});
  document.getElementById('wf').innerHTML = `
    <h3>Workflow Health (last export)</h3>
    <p>${Object.entries(byStatus).map(([k,v])=>`${k}: <b>${v}</b>`).join(' · ')}</p>
  `;
})();
</script>
```

---

## 12) GitHub Project (v2) Field Setup via GraphQL
> Optional automation to create a `Status` field with canonical values.

```bash
# Create Status single-select options via GraphQL
read -r -d '' MUTATION <<'EOF'
mutation($project:ID!){
  updateProjectV2(input:{projectId:$project, title:"Oct–Nov 2025 Delivery"}){projectV2{id}}
}
EOF
PROJECT_ID="<your project id>"
gh api graphql -f project=$PROJECT_ID -f query="$MUTATION"
# (Depending on org settings, you may need to add fields via UI.)
```

---

## 13) Labels & Milestones (one-time helpers)
```bash
# Labels
for L in roadmap program ops slo ml quality release telemetry epic pm governance; do gh label create "$L" -c '#888888' || true; done

# Milestone
gh milestone create "Oct–Nov 2025" --due-date 2025-11-13 || true
```



---

## 14) Execution Summary (as reported)
**Status:** EO‑1→EO‑5 complete; PR #9800 open; Project #8 seeded (67/104 in progress); calendar invite and runbooks added. Artifacts include updated workflows, seeding script, ICS invite, and ML/data runbooks.

---

## 15) Acceptance Verification & Evidence Capture (copy/paste)
> Run these to convert today’s summary into auditable evidence. Attach outputs as artifacts or paste into the Project “Validation” column.

### 15.1 — Error‑Budget Workflow Evidence
```bash
# Show workflow schedules + last run
WF=.github/workflows/error-budget-monitoring.yml
gh workflow view "$WF" --yaml | sed -n '1,120p'

echo "Last 5 runs:" && gh run list --workflow "$WF" --limit 5
# Confirm P0 issues auto‑open on breach (label: P0 or P1)
gh issue list --label P0,slo-breach --limit 10 --json number,title,state,createdAt,url
```

### 15.2 — Metrics Exporter Evidence
```bash
# Confirm hourly artifact exists in latest successful run
WF=.github/workflows/metrics-export.yml
RUN_ID=$(gh run list --workflow "$WF" --status success --limit 1 --json databaseId -q '.[0].databaseId')
echo "RUN_ID=$RUN_ID"
 gh run view "$RUN_ID" --log
 gh run download "$RUN_ID" --name workflow-metrics --dir /tmp/wf-metrics && head -n 5 /tmp/wf-metrics/metrics.csv
```

### 15.3 — Project #8 Seeding Evidence (target: 104 items)
```bash
OWNER=BrianCLong; PROJECT=8
COUNT=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq 'length')
echo "Project items: $COUNT (expected 104)"
# Status distribution
gh project item-list "$PROJECT" --owner "$OWNER" --format json | \
  jq -r '.[] | .fields[] | select(.name=="Status") | .value.name' | sort | uniq -c
```

### 15.4 — Weekly Sync Evidence
```bash
# Confirm ICS committed and linked in wiki/runbook
ls -l calendar/Topicality_Dependency_Sync_Wednesdays.ics
```

### 15.5 — ML Data Refresh Evidence
```bash
# Latest model card + gate result
ls -1 model_cards | tail -n 3
# Last precision gate run
gh run list --workflow er-precision-gate.yml --limit 3
```

> **Attach** console outputs + artifact samples to the acceptance checklist issue.

---

## 16) Post‑Merge Guardrails (enable now)
- **Branch protection:** require status checks `error-budget-monitoring` and `er-precision-gate` before merge; require reviews from `@policy` for Durga changes.
- **Required Secrets check:** add workflow that fails if `PROM_URL`, `PROM_BASIC_AUTH`, `SLACK_WEBHOOK_URL` are missing on default branch.
- **SLO burn auto‑rollback:** tie Maestro canary to exporter metrics (latency p95, error rate) with thresholds; auto‑rollback on 2× window breach.

**Sample required‑secrets step**
```yaml
- name: Assert required secrets present
  run: |
    for k in PROM_URL PROM_BASIC_AUTH SLACK_WEBHOOK_URL; do
      if [ -z "${!k}" ]; then echo "Missing $k"; exit 1; fi; done
  env:
    PROM_URL: ${{ secrets.PROM_URL }}
    PROM_BASIC_AUTH: ${{ secrets.PROM_BASIC_AUTH }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 17) Rollback Plan & Criteria (operational)
**Auto‑rollback when any hold:**
- Error rate > SLO×2 for 10 minutes
- p95 latency > threshold for 15 minutes
- Exporter shows success rate < 90% in the last hour

**Rollback steps (Maestro):**
1. `gh workflow run maestro_rollback.yml -f target_release=<sha|tag>`
2. Freeze deploys for 60 min; open P1 follow‑up
3. Attach exporter and Prometheus snapshots to incident

---

## 18) Project Integrity Audit — CSV vs. Project (#8)
> Use to confirm all **104** tracker rows exist, with expected labels and status.

```bash
#!/usr/bin/env bash
set -euo pipefail
CSV=project_management/october2025_sprint_tracker.csv
OWNER=BrianCLong
PROJECT=8
TMP=$(mktemp)
# Collect project item titles
gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq -r '.[].title' | sort > "$TMP"
# Compare to CSV titles (assumes header `title`)
awk -F, 'NR==1{for(i=1;i<=NF;i++) if($i=="title") c=i; next} {print $c}' "$CSV" | sort > "$TMP.csv"
comm -3 "$TMP.csv" "$TMP" | sed 's/^	/EXTRA: /; s/^/MISSING: /'
```

---

## 19) Acceptance Checklist — Final Sign‑off
- [ ] Evidence uploaded for 15.1–15.5
- [ ] Branch protection & required‑secrets check enabled (Sec. 16)
- [ ] Rollback workflow/criteria documented in wiki (Sec. 17)
- [ ] Project audit shows 0 missing items (Sec. 18)
- [ ] Dashboard tiles live and reading artifacts
- [ ] Close this checklist with links to PRs, runs, and dashboards


---

## 20) Close‑Out Pack (Finalization Helpers)

### 20.1 — Orphaned Issues → Project (#8) Remediation (rate‑limit safe)
```bash
#!/usr/bin/env bash
set -euo pipefail
OWNER=BrianCLong PROJECT=8
QUERY='repo:BrianCLong/summit is:issue state:open "Oct–Nov 2025" in:body'
TMP=$(mktemp)
# Gather existing project titles to avoid dupes
gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq -r '.[].title' > "$TMP"
# Page through issues (handles >100)
PAGE=1
while :; do
  JSON=$(gh issue list --limit 100 --state open --search "$QUERY" --page $PAGE --json title,url)
  COUNT=$(jq length <<< "$JSON"); [ "$COUNT" -eq 0 ] && break
  jq -c '.[]' <<< "$JSON" | while read -r row; do
    title=$(jq -r .title <<< "$row")
    url=$(jq -r .url <<< "$row")
    grep -Fxq "$title" "$TMP" && { echo "SKIP: $title"; continue; }
    echo "ADD:  $title";
    # backoff retry on API limit
    n=0; until gh project item-add "$PROJECT" --owner "$OWNER" --url "$url"; do n=$((n+1)); s=$((2**n)); [ $n -gt 6 ] && exit 1; sleep $s; done
  done
  PAGE=$((PAGE+1))
done
# Verify
gh project item-list "$PROJECT" --owner "$OWNER" --format json | jq 'length'
```

### 20.2 — PR #9800 Rebase Helper
```bash
# Handle merge conflicts quickly
gh pr checkout 9800
 git fetch origin main
 git rebase origin/main || {
   echo "Auto‑rebase failed; attempting minimal cherry‑pick of EO‑1/EO‑2";
   git rebase --abort;
   git checkout -b pr9800-cherry;
   git cherry-pick 42584a676 || true; # adjust if needed
 }
 git push -f --set-upstream origin HEAD
 gh pr view --web
```

### 20.3 — Branch Protection (main)
```bash
# Require status checks before merge (adjust names to your workflow ids)
OWNER=BrianCLong REPO=summit
REQ='{"required_status_checks":{"strict":true,"contexts":["error-budget-monitoring","metrics-export"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":1},"restrictions":null}';
 gh api -X PUT repos/$OWNER/$REPO/branches/main/protection -H "Accept: application/vnd.github+json" -f data="$REQ"
```

### 20.4 — Final Acceptance Issue Template
```
**Final Acceptance — Oct 2025 Runbook**
- [ ] Evidence attached for 15.1–15.5
- [ ] Project #8 = 104/104 items (no orphans)
- [ ] PR #9800 merged (or EO‑1/EO‑2 cherry‑picked)
- [ ] Secrets present: PROM_URL, PROM_BASIC_AUTH, SLACK_WEBHOOK_URL
- [ ] Calendar invite imported (Wednesdays 09:30 CT)
- [ ] Rollback test executed and documented
- [ ] Dashboard tiles reading exporter artifacts
**Links:** PR, Project view, last workflow runs, dashboard, model card
```

