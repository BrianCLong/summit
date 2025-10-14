# IntelGraph — Sprint 18 Subtasks CSV + GitHub Projects Config (v1.0)

**Slug:** `intelgraph-sprint-2025-10-06_subtasks-and-projects_v1.0`  
**Date:** 2025‑09‑29  
**Scope:** Import‑ready **Subtasks CSV**, **Projects (GitHub) JSON + gh script**, **Jira board swimlanes/JQL**, **automation rules**.

> **How to use**
> 1) Import the **Jira Subtasks CSV** *after* the parent Stories exist. Fill the `Parent Key` column with real keys (e.g., `IG‑123`).  
> 2) For GitHub, run the **gh** script to create a Projects (v2) board with fields, views, and filters aligned to the sprint.  
> 3) Optional: use the lightweight **Automation Rules** to mirror status across repos.

---

## 1) Jira CSV — Subtasks (per Story)
- Standardized subtasks for **tests**, **docs**, **telemetry/SLO**, **security/privacy**, **UX copy**, **demo script**, **observability**, **release notes**.
- Replace `TBD-*` assignees and dates as needed.

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Tests: Unit & Contract,"Write/extend unit + contract tests to ≥90% for changed modules. Attach coverage report.",High,qa,trust-fabric,eng-trust@intelgraph.dev,qa@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-12,IG-<parent>
Sub-task,IG,E2E: Golden Flow Validation,"Add/extend E2E for golden flow(s); verifier PASS required; attach PCQ artifact link.",High,qa,trust-fabric,eng-trust@intelgraph.dev,qa@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,IG-<parent>
Sub-task,IG,Docs: Spec & Runbook,"Update spec(s), ADR if needed, and runbook entries. Include API examples and failure modes.",Medium,docs,gov-ops,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,IG-<parent>
Sub-task,IG,Telemetry & SLO Wiring,"Emit events; update dashboards (p95, ingest E2E, policy blocks). Include alert thresholds.",Medium,telemetry,gov-ops,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-14,IG-<parent>
Sub-task,IG,Security/Privacy Review,"Record data classes touched; license/authority references; threat model note; DPIA delta if applicable.",High,security,gov-ops,security@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-10,IG-<parent>
Sub-task,IG,Feature Flag & Config,"Gate behavior behind flag; add config documentation; default OFF; rollout plan.",Medium,feature-flag,trust-fabric,eng-trust@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-09,IG-<parent>
Sub-task,IG,UX Copy/Surface Polish,"Finalize UI copy; policy denial explainer; provenance tooltips text; accessibility check.",Low,ux,ux-copilot,ux@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-15,IG-<parent>
Sub-task,IG,Observability Hooks,"OTEL spans; Prom counters; link trace → manifest/policy IDs; test in dev.",Medium,observability,gov-ops,eng-govops@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-13,IG-<parent>
Sub-task,IG,Demo Script & Data,"Prep stage demo path; seed fixtures; include failure case and recovery.",Low,demo,ux-copilot,pm@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-16,IG-<parent>
Sub-task,IG,Release Notes,"Draft entry for 2025.10.r1 (scope, toggles, known issues, rollback).",Low,release,qa-release,qa@intelgraph.dev,pm@intelgraph.dev,2025.10.r1,"Sprint 18 (Oct 6–17, 2025)",2025-10-17,IG-<parent>
```

> **Tip:** After you import, bulk‑edit all subtasks to the correct `Parent Key` per Story (filter by Summary contains + your Story tag, e.g., `PCA:`).

---

## 2) Jira Board Swimlanes & Quick Filters (JQL)

### 2.1 Swimlanes (by Epic)
```text
EPIC-PCA-ALPHA: "Epic Link" = EPIC-PCA-ALPHA
EPIC-LAC-BETA:  "Epic Link" = EPIC-LAC-BETA
EPIC-CASE-M0:   "Epic Link" = EPIC-CASE-M0
EPIC-OBS-OPS:   "Epic Link" = EPIC-OBS-OPS
EPIC-COPILOT-GLUE: "Epic Link" = EPIC-COPILOT-GLUE
```

### 2.2 Quick Filters
```text
Blocked: statusCategory = "In Progress" AND flag is not EMPTY
Needs Review: status = "In Review" OR status = "Code Review"
Policy‑Touching: labels in (policy-compiler, governance, pcq)
UI‑Facing: component = ux-copilot
Today Due: due <= endOfDay()
```

---

## 3) GitHub Projects (v2) — JSON & `gh` Script
Creates **fields**, **views**, and **filters** matching the sprint.

### 3.1 Project Fields (JSON)
```json
{
  "fields": [
    { "name": "Status", "type": "single_select", "options": ["Backlog", "Ready", "In Progress", "In Review", "Blocked", "Done"] },
    { "name": "Sprint", "type": "text" },
    { "name": "Epic", "type": "text" },
    { "name": "Story Points", "type": "number" },
    { "name": "Component", "type": "text" },
    { "name": "Labels", "type": "text" },
    { "name": "Fix Version", "type": "text" },
    { "name": "Due Date", "type": "date" }
  ],
  "views": [
    { "name": "Sprint 18 Board", "layout": "board", "group_by": "Status", "filter": "Sprint:'Sprint 18 (Oct 6–17, 2025)'" },
    { "name": "By Epic", "layout": "table", "fields": ["Title", "Epic", "Status", "Story Points", "Due Date"], "filter": "Sprint:'Sprint 18 (Oct 6–17, 2025)'" },
    { "name": "Blocked", "layout": "board", "group_by": "Epic", "filter": "Status:'Blocked'" }
  ]
}
```

### 3.2 Bootstrap Script (`scripts/bootstrap_project.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

ORG_SLUG=${ORG_SLUG:-intelgraph}
PROJECT_NAME=${PROJECT_NAME:-"IntelGraph — Sprint 18"}
SPRINT_LABEL="Sprint 18 (Oct 6–17, 2025)"

# Create project
PROJECT_ID=$(gh project create --owner "$ORG_SLUG" --title "$PROJECT_NAME" --format json | jq -r '.id')
echo "Created project: $PROJECT_ID"

# Add fields
add_field() {
  local NAME="$1"; local TYPE="$2"; local OPTIONS="${3:-}"
  if [[ -n "$OPTIONS" ]]; then
    gh project field-create "$PROJECT_ID" --name "$NAME" --type "$TYPE" --options "$OPTIONS" >/dev/null
  else
    gh project field-create "$PROJECT_ID" --name "$NAME" --type "$TYPE" >/dev/null
  fi
}

add_field "Status" "SINGLE_SELECT" "Backlog,Ready,In Progress,In Review,Blocked,Done"
add_field "Sprint" "TEXT"
add_field "Epic" "TEXT"
add_field "Story Points" "NUMBER"
add_field "Component" "TEXT"
add_field "Labels" "TEXT"
add_field "Fix Version" "TEXT"
add_field "Due Date" "DATE"

echo "Fields created. Configure views in UI (API limited); apply filter: Sprint:'$SPRINT_LABEL'"
```

> **Note:** GitHub Projects API for views is limited; the script creates fields reliably. Use the JSON above as a reference to configure views in the UI.

---

## 4) GitHub Actions — Lightweight Automation
- Auto‑label PRs by directory; sync Project fields from PR/issue labels.

### 4.1 `.github/workflows/project-sync.yml`
```yaml
name: Project Sync
on:
  issues:
    types: [opened, edited, labeled]
  pull_request:
    types: [opened, edited, labeled, ready_for_review]

jobs:
  sync:
    permissions:
      issues: write
      pull-requests: write
      contents: read
      repository-projects: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Map labels → fields
        run: |
          echo "This step would call a small script to map labels to project fields via gh CLI or GraphQL."
```

---

## 5) Automation Rules (Jira) — Status Hygiene
```text
Rule: When PR merged (flag 'merged' on issue), transition Story → In Review
Rule: When all Subtasks = Done, transition parent Story → Ready for Review
Rule: When label = policy-compiler added, add Component = gov-ops and assign Gov/Ops reviewer
```

---

## 6) Versioning & Change Log
- **v1.0 (2025‑09‑29):** Initial subtasks CSV, Projects bootstrap script, board JQL, and automations.

