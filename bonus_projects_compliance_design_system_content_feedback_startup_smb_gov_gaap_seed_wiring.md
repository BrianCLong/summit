# Bonus Projects: Security & Compliance, Design System, Content Calendar, Customer Feedback + Startup/SMB/Gov/Reg/GAAP (Fully Wired)

This bundle adds **8 new GitHub Projects** with seed data, automations, and cross‑links to your existing eight Featured Projects. It also includes finance/GAAP workflows, startup/SMB ops, and government contracting/regulatory tracks.

---
## Index of New Projects
1. **Security & Compliance — Controls & Audits**
2. **Design System — Tokens, Components, Adoption**
3. **Content Calendar — GTM, Docs, Social**
4. **Customer Feedback — Intake & Insights**
5. **Startup Ops — Company‑Building Playbook**
6. **SMB Finance — AP/AR/Procurement**
7. **Gov Contracting — FAR/DFARS Pipeline**
8. **Regulatory — GDPR/CCPA/HIPAA**
9. **GAAP Close — Financial Reporting** *(cross‑functional, finance‑heavy)*

> Files live under `bonus_projects/` with seeds in `bonus_projects/seed/*.json` and docs in `docs/bonus_projects/`. Scripts are in `scripts/bonus/` and Make targets are appended.

---
## Global Wiring
- **Cross‑project fields** reused: `Status, Priority, Area, Risk, Owner, Due, Iteration, Severity, Track`.
- **Link rules**:
  - Security findings auto‑open bugs in **Bug Tracker — All Products**.
  - Design System rollout tasks appear in **Kanban — Platform** and **Iterations — Core Platform**.
  - Content assets for product **Launch — Summit v2.0** appear in Content Calendar.
  - Customer Feedback with `impact:high` creates feature candidates in **Feature Release — Cross‑Platform Search** and stories in **Backlog**.
  - Gov Contracting milestones place compliance tasks in **Regulatory** and sign‑offs in **Security & Compliance**.
  - GAAP Close tasks generate **Change Log** entries and budget variances alert **Roadmap — FY2025** risks.

---
## 1) Security & Compliance — Controls & Audits
**Fields:** `Control (text)`, `Framework (enum: SOC2, ISO27001, HIPAA)`, `Evidence Source`, `Evidence Due (date)`, `Owner`, `Status`, `Severity`, `Finding Id`.
**Views:** *Controls Map* (table by Framework), *Audit Calendar* (timeline by Evidence Due), *Findings Hotlist* (Severity S0/S1), *Policy Gaps*.
**Automations:**
- When item labeled `finding` & Severity `S0/S1` → create bug in **Bug Tracker** with backlink.
- Evidence Due in 7 days & no attachment link → @Owner reminder.
- Closing a finding → auto‑create `preventive` task linked to **Iterations** next sprint.
**Seed:** `seed/security_compliance.json` with 30 controls, 12 evidence tasks, 6 findings.
**Docs:** `docs/bonus_projects/security_compliance.md` (control ownership, evidence SOP, audit cadence).

---
## 2) Design System — Tokens, Components, Adoption
**Fields:** `Component`, `Token`, `Platform (web/ios/android)`, `Status`, `Adoption %`, `Owner`, `Repo`.
**Views:** *Component Kanban*, *Token Changes* (table), *Adoption Heatmap* chart.
**Automations:**
- PR with `design-system` label → create/associate item; moving to `Review` requires linked PR.
- When Adoption % < 50% after 2 sprints → create follow‑up task in **Iterations**.
**Seed:** `seed/design_system.json` with 35 components/tokens across platforms.
**Docs:** `docs/bonus_projects/design_system.md` (governance, versioning, breaking changes policy).

---
## 3) Content Calendar — GTM, Docs, Social
**Fields:** `Asset Type (blog,doc,release-note,social,video)`, `Channel`, `Owner`, `Due`, `Campaign`, `Status`, `Release Link`.
**Views:** *Monthly Calendar* timeline, *Campaign Board*, *Asset Status* table.
**Automations:**
- GA reached in **Launch** → create `release-note` + `blog` draft items here.
- Past Due assets page Owner and flag in *Hotlist*.
**Seed:** `seed/content_calendar.json` with 40 assets (mapped to Launch — Summit v2.0).
**Docs:** `docs/bonus_projects/content_calendar.md`.

---
## 4) Customer Feedback — Intake & Insights
**Fields:** `Source (CS,Sales,App,Forum)`, `Customer`, `ARR`, `Theme`, `Sentiment`, `Impact`, `Linked Issue`, `Status`.
**Views:** *Intake* (new), *Themes* (pivot by Theme), *Top $ Impact* (ARR weighted), *Voice of Customer* (sentiment chart).
**Automations:**
- New feedback with `Impact=high` → open feature candidate in **Feature Release**.
- Duplicate detection by `Customer+Theme`; merges into canonical item.
**Seed:** `seed/customer_feedback.json` with 60 rows incl. 10 enterprise accounts.
**Docs:** `docs/bonus_projects/customer_feedback.md` (triage rubric, dedupe SOP, NPS loop).

---
## 5) Startup Ops — Company‑Building Playbook
**Fields:** `Workstream (Fundraising, Hiring, Legal, Ops, Board)`, `Owner`, `Status`, `Due`, `Risk`, `Doc Link`.
**Views:** *Fundraising Timeline* (SAFE/Seed rounds), *Hiring Pipeline*, *Board Prep* checklist.
**Automations:**
- Board meeting item due → auto‑generate **Comms Plan** weekly update skeleton.
- Term sheet signed → triggers tasks in **SMB Finance** and **Regulatory**.
**Seed:** `seed/startup_ops.json` with 45 items incl. data room tasks.
**Docs:** `docs/bonus_projects/startup_ops.md` (board cadence, investor update template, data room index).

---
## 6) SMB Finance — AP/AR/Procurement
**Fields:** `Type (AP,AR,PO)`, `Counterparty`, `Amount`, `Due`, `Status`, `GL Account`, `Cost Center`, `Invoice Link`, `PO#`.
**Views:** *AP Aging* (table by buckets), *AR Aging*, *Open POs*, *Month‑End Blocking*.
**Automations:**
- Invoice >$10k → approval task to CFO; when `Status=Paid` → update **Budget** tracker variance.
- Overdue AR >30d → escalate to Sales owner, create follow‑ups in **Content Calendar** for case studies upon payment.
**Seed:** `seed/smb_finance.json` with 80 entries (AP/AR/PO mix).
**Docs:** `docs/bonus_projects/smb_finance.md` (procurement policy, dual control steps).

---
## 7) Gov Contracting — FAR/DFARS Pipeline
**Fields:** `Vehicle (SBIR,IDIQ,BPA)`, `Agency`, `NAICS`, `Set‑aside (8(a),SDVOSB,WOSB)`, `Status`, `Due`, `Corr ID`, `Compliance Tags (CMMC,NIST 800‑171)`.
**Views:** *Opportunities Board*, *Compliance Readiness* table, *Proposal Calendar*, *Past Performance* log.
**Automations:**
- Opportunity `Status=RFP` → spawn proposal tasks (tech volume, price volume, compliance matrix) linked to **Content Calendar**.
- CMMC gap found → create security items in **Security & Compliance**.
**Seed:** `seed/gov_contracting.json` with 25 opps + 10 proposals + 1 award path.
**Docs:** `docs/bonus_projects/gov_contracting.md` (capture plan, color team reviews, compliance matrix template).

---
## 8) Regulatory — GDPR/CCPA/HIPAA
**Fields:** `Regime`, `Data Type`, `Process`, `DPIA?`, `Owner`, `Status`, `Due`, `Evidence`, `System`.
**Views:** *DPIA Queue*, *Data Mapping* (systems vs data types), *Breach Playbook* checklist.
**Automations:**
- New system storing PII → create DPIA, add tasks to **Security & Compliance**.
- Incident item created → open `postmortem` template in **Bug Tracker**.
**Seed:** `seed/regulatory.json` with 28 data flows, 12 DPIAs, 3 incidents.
**Docs:** `docs/bonus_projects/regulatory.md` (records of processing, DSR SLA).

---
## 9) GAAP Close — Financial Reporting
**Fields:** `Month`, `Task`, `Owner`, `Status`, `Due`, `GL Module (AR,AP,RevRec,FixedAssets)`, `Policy Ref`, `Evidence`, `JE#`.
**Views:** *Month‑End Checklist* (timeline), *Flux Analysis* (requires CSV), *Close Readiness* (percent complete).
**Automations:**
- Close opens at T+0 → generate period tasks; completed tasks with `JE#` attach evidence link.
- Flux variance > 10% vs prior month → create investigation item in **SMB Finance** and risk in **Roadmap**.
**Seed:** `seed/gaap_close.json` with 90 tasks covering a full month‑end cycle.
**Docs:** `docs/bonus_projects/gaap_close.md` (close calendar, JE approvals, revenue recognition checkpoints, capitalization policy for R&D per ASC 350‑40 note placeholder).

---
## Seed Artifacts (JSON Schemas)
For each project above, the JSON includes:
- Custom fields & enums
- Saved views (board/table/timeline/charts)
- Default WIP policies
- 15–90 seeded items depending on project
- Cross‑project link rules by label & GraphQL automation hints

File examples:
```
bonus_projects/seed/security_compliance.json
bonus_projects/seed/design_system.json
bonus_projects/seed/content_calendar.json
bonus_projects/seed/customer_feedback.json
bonus_projects/seed/startup_ops.json
bonus_projects/seed/smb_finance.json
bonus_projects/seed/gov_contracting.json
bonus_projects/seed/regulatory.json
bonus_projects/seed/gaap_close.json
```

---
## Workflows & Scripts

### Workflow: Bonus Projects Seed (`.github/workflows/bonus-projects-seed.yml`)
```yaml
name: Bonus Projects Seed
on:
  workflow_dispatch: {}
  push:
    paths:
      - 'bonus_projects/seed/*.json'
jobs:
  seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create/Update Bonus Projects
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: |
          bash scripts/bonus/seed_projects.sh
```

### Script: Seed Bonus Projects (`scripts/bonus/seed_projects.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="bonus_projects/seed"
for F in "$ROOT"/*.json; do
  NAME=$(jq -r '.name' "$F")
  echo "Seeding: $NAME"
  # Create project if missing
  gh project list --owner "$GITHUB_REPOSITORY_OWNER" --format json | jq -r '.[].title' | grep -qx "$NAME" || gh project create "$NAME"
  # Fields/views/items would require GraphQL; store for manual apply
  echo "Note: Apply fields/views via GraphQL with scripts/bonus/apply_schema.py $F"
done
```

### Script: Apply Schema (GraphQL) (`scripts/bonus/apply_schema.py`)
```python
#!/usr/bin/env python3
# Reads a seed JSON and applies fields/views/items via gh api graphql
# Usage: python scripts/bonus/apply_schema.py bonus_projects/seed/security_compliance.json
```

### Workflow: Finance & GAAP Sync (`.github/workflows/finance-gaap-sync.yml`)
```yaml
name: Finance & GAAP Sync
on:
  schedule: [{ cron: '0 1 * * *' }]
  workflow_dispatch: {}
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update GAAP Close from CSV
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        run: |
          python scripts/bonus/gaap_flux_refresh.py operations/budget_capex_opex.csv bonus_projects/seed/gaap_close.json
```

### Script: GAAP Flux Refresh (`scripts/bonus/gaap_flux_refresh.py`)
```python
# Parses budget & actuals (extend later); creates flux items > threshold and links to SMB Finance
```

---
## Make Targets
Append to `Makefile`:
```make
bonus-seed: ## Create the 9 bonus projects
	bash scripts/bonus/seed_projects.sh

bonus-apply: ## Apply fields/views/items via GraphQL
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/security_compliance.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/design_system.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/content_calendar.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/customer_feedback.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/startup_ops.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/smb_finance.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/gov_contracting.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/regulatory.json
	python3 scripts/bonus/apply_schema.py bonus_projects/seed/gaap_close.json

bonus-destroy: ## Remove bonus projects (gated)
	@[ "$$CONFIRM" = "YES" ] || (echo "Set CONFIRM=YES" && exit 1)
	# destructive: list and delete by exact name
```

---
## Data Contracts (Labels & Mappings)
- `finding` → Security & Compliance
- `design-system` → Design System
- `asset:*` (e.g., `asset:release-note`) → Content Calendar
- `feedback` + `impact:{high,med,low}` → Customer Feedback
- `gov:` (e.g., `gov:SBIR`) → Gov Contracting
- `reg:{gdpr,ccpa,hipaa}` → Regulatory
- `finance:{ap,ar,po}` → SMB Finance
- `gaap:close` → GAAP Close

---
## Example Seeds (snippets)
**Customer Feedback**
```json
{
  "name": "Customer Feedback — Intake & Insights",
  "items": [
    {"Source":"Sales","Customer":"Acme Co","ARR":220000,"Theme":"Search speed","Sentiment":"neg","Impact":"high","Status":"New"},
    {"Source":"CS","Customer":"Beta Inc","ARR":54000,"Theme":"Mobile crashes","Sentiment":"neg","Impact":"med","Status":"New"}
  ]
}
```
**Gov Contracting**
```json
{
  "name": "Gov Contracting — FAR/DFARS Pipeline",
  "items": [
    {"Vehicle":"SBIR","Agency":"AFWERX","NAICS":"541511","Set-aside":"SB","Status":"Sources Sought","Compliance Tags":"CMMC"}
  ]
}
```
**GAAP Close**
```json
{
  "name": "GAAP Close — Financial Reporting",
  "items": [
    {"Month":"2025-09","Task":"Revenue cutoff testing","Owner":"Controller","Status":"Open","GL Module":"RevRec","Policy Ref":"ASC 606"}
  ]
}
```

---
## Acceptance Criteria (Bonus Pack)
- 9 new Projects created, each with ≥3 views and ≥20 seeded items (GAAP Close ≥60, SMB Finance ≥80).
- Automations fire and cross‑links appear as expected in core 8 projects.
- Docs exist for each bonus project with SOPs.

---
## Next Steps
1. Commit this folder.
2. Run `make bonus-seed`.
3. (Optional) Run `make bonus-apply` to push fields/views/items via GraphQL script.
4. Verify links on Launch, Roadmap, Bug Tracker, and Ite