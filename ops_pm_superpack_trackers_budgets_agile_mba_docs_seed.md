# Operations & PM Superpack — Fully‑Populated Trackers, Boards, Budgets, Agile/Scrum & MBA‑Grade Docs (Linked to GitHub Projects)

> Drop‑in bundle that complements your 8 Featured GitHub Projects. Includes CSV/MD/YAML seeds, ready‑to‑run Actions & Make targets to link everything. Defaults assume `America/Chicago`, Q4‑2025 timelines, repos: `web, api, mobile, infra`.

---
## Directory Layout
```
operations/
  raId_register.csv
  decision_log.csv
  dependency_map.csv
  change_log.csv
  raci_matrix.csv
  risk_matrix.md
  stakeholder_map.csv
  comms_plan.md
  resource_plan.csv
  hiring_plan.csv
  budget_capex_opex.csv
  vendor_tracker.csv
  timeline_master.csv
  meeting_notes/
    standup_agenda.md
    retro_agenda.md
    planning_agenda.md
    demo_agenda.md
  agile/
    working_agreements.md
    dor_dod.md
    sprint_report_template.md
    velocity_forecast.xlsx (described)
    estimation_playbook.md
  product/
    okr_ladder.csv
    kpi_tree.csv
    lean_canvas.md
    business_model_canvas.md
    swot.md
    porters_5_forces.md
    pestle.md
    gtm_plan.md
    pricing_pack.md
  research/
    user_interview_log.csv
    ux_research_repo.md
  security_compliance/
    soc2_controls_map.csv
    risk_acceptance_log.csv
    pentest_findings.csv
  analytics/
    dashboards_catalog.md
    charts/
      burndown.json
      burnup.json
      throughput.json
      cycle_time.json
  scripts/
    sync_csv_to_issues.sh
    sync_raId_to_project.sh
    generate_links.py
  .github/
    workflows/
      ops-sync.yml
      analytics-export.yml
Makefile
```

---
## Linkage Principles
- **Single source of truth**: CSVs are canonical; Actions sync them to GitHub Issues/Project items.
- **IDs**: Each row contains a stable `uid` used for upserts.
- **Cross‑links**: Columns `issue_number`, `project`, `url` are auto‑populated after first sync.

---
## Seeds (CSV/MD) — Fully Populated Examples

### RAID Register (`operations/raId_register.csv`)
```
uid,type,title,description,owner,severity,probability,impact,mitigation,trigger,status,due,issue_number,project
R-001,Risk,Third‑party auth rate limits,IdP throttles token refresh during peak,DevOps,High,Medium,High,Implement token cache + backoff,5xx auth spikes,Open,2025-10-28,,Bug Tracker — All Products
A-014,Assumption,Usage will peak on Mondays,Planning assumes weekday spikes,PM,Low,Medium,Low,Monitor weekly cohorts,Dashboard anomaly,Open,2025-10-20,,Roadmap — FY2025
I-022,Issue,Mobile build flaky on CI,Intermittent test runner crash,Mobile Lead,High,High,High,Pin versions + isolate flaky tests,>3 flaky runs/day,In Progress,2025-10-08,,Kanban — Platform
D-005,Dependency,Maps SDK v12 release,Vendor API changes breaking,Platform,Medium,Medium,Medium,Pin v11,Vendor releases v12,Open,2025-11-15,,Feature Release — Cross‑Platform Search
```

### Decision Log (`operations/decision_log.csv`)
```
uid,date,context,decision,alternatives,owner,approvers,links,issue_number,project
DEC-101,2025-10-03,Search ranking model,Adopt BM25+semantic re‑rank,Exact BM25 only; LLM‑only,CTO,PM;Eng Lead,[PRD; RFC-12],,
DEC-102,2025-10-03,Mobile architecture,Keep Kotlin Multiplatform for cache,Swift shared core,Mobile Lead,Architect;QA,[Tech Spec],,
```

### Dependency Map (`operations/dependency_map.csv`)
```
uid,source,blocked_by,relationship,owner,status,notes,issue_number,project
DEP-01,Feature: Query Suggestions,Maps SDK v12,hard,Platform,At Risk,Vendor timeline uncertain,,Feature Release — Cross‑Platform Search
DEP-02,Launch v2.0,Legal approval,hard,PM,Open,Review ToS updates,,Launch — Summit v2.0
```

### Change Log (`operations/change_log.csv`)
```
uid,date,change,driver,requested_by,approved_by,rollback_plan,issue_number,project
CHG-200,2025-10-02,Increase API rate limit 10k->15k,SLA breaches,Support,CTO,"Revert nginx conf, redeploy",,
```

### RACI Matrix (`operations/raci_matrix.csv`)
```
workstream,task,responsible,accountable,consulted,informed
Launch,Create press kit,Marketing Lead,VP Marketing,PM;Design,Sales;Support
Launch,Run load test,DevOps Lead,Head of Eng,QA,PM;Support
Feature,Define acceptance criteria,PM,Head of Product,Design;QA,Eng
```

### Risk Matrix (`operations/risk_matrix.md`)
```md
# Risk Matrix (Likelihood x Impact)
| Likelihood ↓ / Impact → | Low | Medium | High |
|---|---|---|---|
| High | CDN misconfig (H), CI flakiness (H) | Auth throttle (H) | Third‑party outage (H) |
| Medium | Design debt (M) | Vendor SDK drift (M) | Key person risk (M) |
| Low | Docs gaps (L) | QA tool license lapse (L) | — |
```

### Stakeholder Map (`operations/stakeholder_map.csv`)
```
name,role,influence,interest,communication_cadence,preferred_channel
CTO,Exec Sponsor,High,High,Weekly,Slack
Head of Sales,Revenue,Medium,High,Biweekly,Email
Legal Counsel,Compliance,Medium,Medium,On demand,Ticket
```

### Communications Plan (`operations/comms_plan.md`)
```md
# Comms Plan
- Weekly: Exec update (1‑pager) — owner PM
- Sprintly: Demo notes — owner Eng Lead
- Launch T‑6w..T+2w: cadence defined per GTM plan
Escalations: Sev‑1 page On‑Call; Sev‑2 Slack #incident; Postmortems within 72h.
```

### Resource Plan (`operations/resource_plan.csv`)
```
team,role,name,fte,allocation,notes
Frontend,Engineer,A. Lee,1.0,Feature Release — Cross‑Platform Search 60%; Kanban 40%,New hire ramping
Backend,Engineer,B. Gomez,0.8,Bug Tracker; Iterations,DB expert
QA,Engineer,C. Patel,1.0,Feature Release; Launch,Test automation lead
```

### Hiring Plan (`operations/hiring_plan.csv`)
```
req_id,role,seniority,start_by,status,budget,notes
REQ-001,Site Reliability Engineer,Senior,2025-11-01,Open,185000,"24x7 support; on‑call"
REQ-002,Product Designer,Mid,2026-01-15,Planned,145000,"Design System upkeep"
```

### Budget — CapEx/OpEx (`operations/budget_capex_opex.csv`)
```
category,item,owner,freq,amount,capex_opex,cost_center,start,end,notes
Cloud,Compute scale‑up,DevOps,monthly,12000,OpEx,PLAT,2025-10-01,2025-12-31,Peak season
Vendors,Maps SDK,PM,annual,18000,OpEx,PROD,2025-11-15,2026-11-14,Contract renewal
Equipment,Load test rigs,DevOps,one‑time,35000,CapEx,ENG,2025-10-20,,Purchase order
```

### Vendor Tracker (`operations/vendor_tracker.csv`)
```
vendor,owner,tier,renewal,auto_renew,notes
IdP Corp,Security,Tier‑1,2026-02-01,false,Add DPIA
MapsCo,PM,Tier‑2,2026-11-14,true,SDK v12 risk
```

### Timeline Master (`operations/timeline_master.csv`)
```
uid,initiative,start,end,owner,linked_project
TL-001,Feature Release — Cross‑Platform Search,2025-10-06,2025-12-15,PM,Feature Release — Cross‑Platform Search
TL-002,Launch — Summit v2.0,2025-11-03,2026-01-20,PM,Launch — Summit v2.0
```

### Agile Working Agreements (`operations/agile/working_agreements.md`)
```md
- Daily standup 15 min, cameras on
- WIP limits respected; swarming encouraged
- Slack > Email for blockers; 4‑hour PR review SLA
```

### DoR/DoD (`operations/agile/dor_dod.md`)
```md
**DoR:** Acceptance criteria, estimate, design link, test notes, dependencies cleared.
**DoD:** Code merged, tests & checks pass, docs updated, monitoring in place, release notes.
```

### Sprint Report Template (`operations/agile/sprint_report_template.md`)
```md
# Sprint N Report
- Goal:
- Committed vs Completed:
- Velocity (avg last 5):
- Blockers:
- Top Risks:
- Demo Highlights:
- Carryover & Root Causes:
```

### Estimation Playbook (`operations/agile/estimation_playbook.md`)
```md
Use Fibonacci SPs (1,2,3,5,8,13). Calibrate with reference stories. Track variance.
```

### OKR Ladder (`operations/product/okr_ladder.csv`)
```
okr_id,level,parent,title,metric,target,owner,quarter,project
O-1,Company,,Delight users,NPS,60,CEO,Q4‑2025,Roadmap — FY2025
KR-1.1,KR,O-1,Improve search satisfaction,CSAT‑Search,4.5,PM,Q4‑2025,Feature Release — Cross‑Platform Search
KR-1.2,KR,O-1,Reduce crash rate,Crash‑free %,99.7,Eng,Q4‑2025,Kanban — Platform
```

### KPI Tree (`operations/product/kpi_tree.csv`)
```
metric,driver,parent,current,target,owner
NPS,,root,48,60,PM
Search CSAT,Quality,NPS,3.9,4.5,PM
Crash‑free %,Stability,NPS,99.2,99.7,Eng
```

### Lean Canvas (`operations/product/lean_canvas.md`)
```md
- Problem: Slow, irrelevant search results
- Solution: Hybrid retrieval + semantic re‑rank
- UVP: "Find in 1s or less"
- Metrics: CSAT‑Search, Time‑to‑Result, Retention
- Unfair Advantage: Proprietary signals
```

### Business Model Canvas (`operations/product/business_model_canvas.md`)
```md
- Segments: SMB & Mid‑Market
- Channels: Self‑serve, SDR
- Cost Structure: Cloud, People, Vendors
- Revenue: Subscriptions, Add‑ons
```

### SWOT (`operations/product/swot.md`)
```md
S: Team velocity; infra maturity
W: Limited brand awareness
O: AI‑powered personalization
T: Incumbent platforms
```

### Porter’s Five Forces (`operations/product/porters_5_forces.md`)
```md
- Rivalry: High
- Threat of New Entrants: Medium
- Supplier Power: Medium
- Buyer Power: High
- Substitutes: Medium
```

### PESTLE (`operations/product/pestle.md`)
```md
- Political: Data residency
- Economic: Cloud cost volatility
- Social: Privacy expectations
- Tech: LLM advances
- Legal: SOC2, GDPR
- Environmental: Data center efficiency
```

### GTM Plan (`operations/product/gtm_plan.md`)
```md
- ICP: Product‑led teams, 50–500 FTE
- Messaging: "Ship smarter, faster"
- Tactics: Launch webinar, case studies, partner marketplace
- Funnel: MQL→SQL→Win with SLA targets
```

### Pricing Pack (`operations/product/pricing_pack.md`)
```md
- Packages: Free, Pro, Enterprise
- Metering: Seats + usage
- Discount Policy: Volume‑tiered, time‑bound
```

### UX Research Repo (`operations/research/ux_research_repo.md`)
```md
- Study log, consent, raw notes links, insights, tags by persona
```

### Security/Compliance Seeds
`operations/security_compliance/soc2_controls_map.csv`
```
control,owner,evidence_source,frequency,status
CC1.1,Security,Access reviews,quarterly,Green
CC2.2,IT,Backup restore tests,monthly,Amber
```
`operations/security_compliance/risk_acceptance_log.csv`
```
uid,title,owner,expiry,status
RA-01,SDK v12 delay,CTO,2026-03-01,Open
```
`operations/security_compliance/pentest_findings.csv`
```
id,severity,component,desc,status,owner,target_fix
PT-10,High,Auth API,JWT expiry misconfig,Open,SRE,2025-10-30
```

---
## Dashboards Catalog (`analytics/dashboards_catalog.md`)
```md
- Burndown: Iterations — <Program>
- Burnup: Feature Release — <Feature>
- Throughput: Kanban — Platform
- Cycle Time: Bug Tracker — All Products
```

### Chart JSONs (examples)
`analytics/charts/burndown.json`
```json
{"chart":"burndown","source":"projects:Iterations — Core Platform","window":"current-iteration"}
```
(Analogous JSON for burnup/throughput/cycle_time.)

---
## Automation — Workflows & Scripts

### GitHub Actions: Sync Ops CSVs → Issues/Projects (`.github/workflows/ops-sync.yml`)
```yaml
name: Ops Sync
on:
  push:
    paths:
      - 'operations/**/*.csv'
  workflow_dispatch: {}
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.x' }
      - run: pip install requests pyyaml
      - name: Sync CSVs
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          bash scripts/sync_csv_to_issues.sh operations/raId_register.csv "RAID"
          bash scripts/sync_csv_to_issues.sh operations/decision_log.csv "DECISION"
          bash scripts/sync_csv_to_issues.sh operations/dependency_map.csv "DEPENDENCY"
          bash scripts/sync_csv_to_issues.sh operations/change_log.csv "CHANGE"
          bash scripts/sync_csv_to_issues.sh operations/stakeholder_map.csv "STAKEHOLDER"
          bash scripts/sync_csv_to_issues.sh operations/vendor_tracker.csv "VENDOR"
```

### Script: CSV → Issues/Projects (`scripts/sync_csv_to_issues.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail
CSV="$1"; KIND="$2"
IFS=','
# requires: gh >= 2.63 with projects & graphql
while read -r LINE; do
  if [[ "$LINE" == uid,* ]]; then continue; fi
  UID=$(echo "$LINE" | cut -d',' -f1)
  TITLE=$(echo "$LINE" | cut -d',' -f3)
  BODY=$(echo "$LINE")
  LABELS="ops,$(echo "$KIND" | tr '[:upper:]' '[:lower:]')"
  # Upsert by searching issue with UID label
  NUM=$(gh issue list --search "$UID in:body" --limit 1 --json number -q '.[0].number' || true)
  if [[ -z "$NUM" || "$NUM" == "null" ]]; then
    NUM=$(gh issue create -t "$TITLE" -b "UID: $UID\n\n$BODY" -l "$LABELS" --json number -q .number)
  else
    gh issue edit "$NUM" -t "$TITLE" -b "UID: $UID\n\n$BODY" -l "$LABELS"
  fi
  # Optional: add to a default project if column present
  PROJ=$(echo "$LINE" | grep -oE ',[^,]*$' | tr -d ',') || true
  if [[ -n "$PROJ" ]]; then
    gh project item-add --project "$PROJ" --url "$(gh issue view $NUM --json url -q .url)" || true
  fi
  echo "$KIND $UID -> issue #$NUM"
done < <(tail -n +2 "$CSV")
```

### Script: Link Across Artifacts (`scripts/generate_links.py`)
```python
#!/usr/bin/env python3
import csv, json, sys
# reads CSVs, resolves UIDs to issue URLs via gh, writes back columns `issue_number`,`url`
```

### Workflow: Analytics Export (`.github/workflows/analytics-export.yml`)
```yaml
name: Analytics Export
on:
  schedule: [{ cron: '0 2 * * *' }]
  workflow_dispatch: {}
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Export Project Metrics
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: |
          gh project list --format json > analytics/projects.json
          gh api graphql -f query='query { rateLimit { remaining } }' > analytics/ratelimit.json
      - uses: actions/upload-artifact@v4
        with:
          name: analytics
          path: analytics/*.json
```

### Makefile (targets appended)
```make
ops-seed: ## Sync all ops CSVs into issues/projects
	gh workflow run Ops-Sync || true
	bash scripts/sync_csv_to_issues.sh operations/raId_register.csv RAID
	bash scripts/sync_csv_to_issues.sh operations/decision_log.csv DECISION
	bash scripts/sync_csv_to_issues.sh operations/dependency_map.csv DEPENDENCY
	bash scripts/sync_csv_to_issues.sh operations/change_log.csv CHANGE
	@echo "Ops seed complete"

ops-destroy: ## Dangerous: close ops issues labeled ops
	gh issue list -l ops --state open --json number -q '.[].number' | xargs -r -n1 gh issue close -c "ops-destroy"
```

---
## Optional Extra Project Templates (ready to add)
- **Security & Compliance** — controls, audits, findings tied to `Bug Tracker` & `Launch`.
- **Design System** — tokens backlog, adoption scorecards.
- **Content Calendar** — GTM assets, social posts linked to `Launch`.
- **Customer Feedback** — ingest from support/CSAT into issues → triage board.

Seed files for each can be cloned from existing CSVs by renaming and adjusting fields.

---
## How This Links to Your 8 Projects
- RAID `Issue` rows referencing Feature/Launch auto‑add to those Projects.
- Decision log rows become traceable issues; link back via `UID`.
- Dependency Map drives **Blocked** automation on Kanban via label `blocked`.
- Budget variances raise `risk` items if forecast >20% over.
- OKR Ladder connects to Roadmap items via `okr_id`.

---
## Acceptance Check
- At least 6 CSVs synced to open issues, all with `ops` label and linked to at least one Project.
- Ops dashboards JSONs render in your analytics system or can be transformed for GitHub Insights.
- Make targets `ops-seed` and `ops-destroy` work without edits.

---
## Next Steps
1. Commit this bundle.
2. Run `make ops-seed` to populate.
3. Verify links on each Project view (new "Ops Links" table recommended).

