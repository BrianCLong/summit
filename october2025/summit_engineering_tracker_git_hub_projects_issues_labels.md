# Summit — Engineering Tracker (GitHub Projects/Issues/Labels)

> Drop‑in operating system for the PRD. Paste/commit these assets into the repo root to run execution from GitHub. Designed for GitHub Projects (Beta), Issues, Labels, Milestones, and Actions.

---

## 0) Quick start

1. **Create milestones**: `MVP‑2` and `GA v1.0`.
2. **Create a GitHub Project** (org or repo level) named `Summit Delivery`.
3. **Commit the files** in this document (copy sections into real files) and push to `main`.
4. (Optional) Run the provided **`gh`** commands to bootstrap labels/milestones.

---

## 1) Label taxonomy

> Opinionated, composable labels mapped to PRD sections. Use multiple per issue.

### 1.1 Areas (prefix `area/`)
- `area/ingestion` — connectors, airflow, pipelines
- `area/storage` — DB, search, graph, lake
- `area/api` — REST/Graph, gateway
- `area/ui` — client, dashboards, briefs
- `area/ml` — extraction, clustering, ER, registry
- `area/rules` — alerting DSL, triage
- `area/playbooks` — actions, approvals
- `area/security` — authn/z, KMS, audit, compliance
- `area/sre` — SLOs, observability, on‑call
- `area/devex` — tooling, CI, release trains

### 1.2 Workflows / Objects
- `wf/campaigns`, `wf/cases`, `wf/triage`, `wf/briefs`

### 1.3 Types
- `type/feature`, `type/bug`, `type/chore`, `type/spike`, `type/doc`, `type/design`, `type/test`

### 1.4 Priority
- `P0`, `P1`, `P2`, `P3`

### 1.5 Risk & Security
- `risk/high`, `risk/med`, `risk/low`, `security/blocker`, `security/review`, `privacy/pii`

### 1.6 Compliance / Program
- `compliance/soc2`, `program/release-train`, `program/pilot`

### 1.7 Connectors (examples)
- `conn/x`, `conn/reddit`, `conn/web-crawl`, `conn/edr`, `conn/siem`, `conn/slack`

---

## 2) Milestones

- **MVP‑2** — Thin E2E slice; Entity Resolution v1; Campaign Clustering v1; Triage & Playbooks v1; Operator Copilot v0.9; 6 connectors. Target: *see PRD §11*.
- **GA v1.0** — Multi‑tenant, SLOs, compliance, marketplace beta, SDKs, scale tests. Target: *see PRD §9, §11*.

---

## 3) Project fields (GitHub Projects Beta)

Create a project named **`Summit Delivery`** with these fields:

- `Status` (single select): `Backlog`, `Design`, `In Progress`, `Blocked`, `In Review`, `Ready to Ship`, `Done`
- `Area` (single select): `Ingestion`, `Storage`, `API`, `UI`, `ML`, `Rules`, `Playbooks`, `Security`, `SRE`, `DevEx`
- `Risk` (single select): `Low`, `Medium`, `High`
- `Impact` (single select): `Critical`, `High`, `Medium`, `Low`
- `Confidence` (single select): `High`, `Medium`, `Low`
- `Size` (number): story points or t‑shirt mapped to numbers (S=1, M=3, L=5, XL=8)
- `Milestone` (text): mirror of GitHub milestone name
- `Target` (date): planned ship date
- `Owner` (text)

> Automation below syncs labels ⇄ fields and issues ⇄ project.

---

## 4) Mapping PRD → labels/milestones

| PRD Section | Labels | Milestone |
|---|---|---|
| **§8.1 Architecture hardening** | `area/ingestion`, `area/storage`, `area/api`, `type/feature` | MVP‑2 |
| **§8.2 Observability & SRE** | `area/sre`, `type/feature`, `program/release-train` | MVP‑2 |
| **§8.3 Data/ML** | `area/ml`, `type/feature`, `risk/med` | MVP‑2 |
| **§8.4 Security** | `area/security`, `security/review`, `compliance/soc2` | MVP‑2 |
| **§8.5 Delivery** | `area/devex`, `type/chore` | MVP‑2 |
| **§7.2 Workspaces & Cases** | `area/ui`, `wf/cases`, `type/feature` | MVP‑2 |
| **§7.2 Entity Resolution v1** | `area/ml`, `wf/triage`, `type/feature` | MVP‑2 |
| **§7.2 Campaign Clustering v1** | `area/ml`, `wf/campaigns`, `type/feature` | MVP‑2 |
| **§7.2 Alerting & Triage v1** | `area/rules`, `wf/triage`, `type/feature` | MVP‑2 |
| **§7.2 Playbooks v1** | `area/playbooks`, `type/feature` | MVP‑2 |
| **§7.2 Operator Copilot v0.9** | `area/ui`, `area/ml`, `type/feature` | MVP‑2 |
| **§7.2 Connectors (pilot)** | `area/ingestion`, `conn/*`, `type/feature` | MVP‑2 |
| **§7.2 Dashboards & Briefs** | `area/ui`, `wf/briefs`, `type/feature` | MVP‑2 |
| **§9 GA Multi‑tenant** | `area/security`, `area/storage`, `type/feature` | GA v1.0 |
| **§9 Marketplace** | `area/devex`, `type/feature` | GA v1.0 |
| **§9 Playbooks v2** | `area/playbooks`, `type/feature` | GA v1.0 |
| **§9 Copilot v1** | `area/ui`, `area/ml`, `type/feature` | GA v1.0 |
| **§9 Compliance pack** | `area/security`, `compliance/soc2` | GA v1.0 |

---

## 5) Repo files to add

Create the following files in your repo. The content blocks are ready to copy.

### 5.1 `.github/labels.yml`
```yaml
# Create with "gh label create -f -F .github/labels.yml" (script below)
- name: area/ingestion
  color: 0e8a16
- name: area/storage
  color: 0366d6
- name: area/api
  color: 1d76db
- name: area/ui
  color: d93f0b
- name: area/ml
  color: a2eeef
- name: area/rules
  color: 7057ff
- name: area/playbooks
  color: bfdadc
- name: area/security
  color: b60205
- name: area/sre
  color: fbca04
- name: area/devex
  color: c2e0c6
- name: wf/campaigns
  color: 0052cc
- name: wf/cases
  color: 108a00
- name: wf/triage
  color: 5319e7
- name: wf/briefs
  color: 2082f2
- name: type/feature
  color: 1d76db
- name: type/bug
  color: d73a4a
- name: type/chore
  color: fef2c0
- name: type/spike
  color: e4e669
- name: type/doc
  color: 0e8a16
- name: type/design
  color: c5def5
- name: type/test
  color: 5319e7
- name: P0
  color: b60205
- name: P1
  color: d93f0b
- name: P2
  color: fbca04
- name: P3
  color: c2e0c6
- name: risk/high
  color: b60205
- name: risk/med
  color: fbca04
- name: risk/low
  color: c2e0c6
- name: security/blocker
  color: b60205
- name: security/review
  color: 0366d6
- name: privacy/pii
  color: 5319e7
- name: compliance/soc2
  color: 0e8a16
- name: program/release-train
  color: 0052cc
- name: program/pilot
  color: 5319e7
- name: conn/x
  color: 1da1f2
- name: conn/reddit
  color: ff4500
- name: conn/web-crawl
  color: 6f42c1
- name: conn/edr
  color: 2b7489
- name: conn/siem
  color: 0366d6
- name: conn/slack
  color: 4a154b
```

### 5.2 `.github/ISSUE_TEMPLATE/feature.yml`
```yaml
name: Feature request
description: Track a feature aligned to PRD
labels: [type/feature]
title: "feat: <concise title>"
body:
  - type: dropdown
    id: area
    attributes:
      label: Area
      options: [ingestion, storage, api, ui, ml, rules, playbooks, security, sre, devex]
    validations:
      required: true
  - type: input
    id: prd
    attributes:
      label: PRD section
      description: e.g., §7.2 Playbooks v1
      placeholder: §<section>
  - type: textarea
    id: user_story
    attributes:
      label: User story
      placeholder: As a <role>, I want <capability> so that <outcome>.
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Given/When/Then, success metrics
  - type: textarea
    id: scope
    attributes:
      label: Scope & notes
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options: [P0, P1, P2, P3]
    validations:
      required: true
  - type: dropdown
    id: risk
    attributes:
      label: Risk
      options: [risk/high, risk/med, risk/low]
```

### 5.3 `.github/ISSUE_TEMPLATE/bug.yml`
```yaml
name: Bug
description: Defect impacting users/tests
labels: [type/bug]
title: "bug: <area> <summary>"
body:
  - type: textarea
    id: description
    attributes:
      label: What happened?
      description: Expected vs actual
  - type: textarea
    id: repro
    attributes:
      label: Reproduction steps
  - type: textarea
    id: impact
    attributes:
      label: Impact
      description: Who is affected, severity (P0–P3)
  - type: input
    id: logs
    attributes:
      label: Links/logs/screens
```

### 5.4 `.github/ISSUE_TEMPLATE/spike.yml`
```yaml
name: Spike / Research
description: Time‑boxed research with deliverables
labels: [type/spike]
title: "spike: <topic>"
body:
  - type: input
    id: question
    attributes:
      label: Decision/Question
  - type: textarea
    id: plan
    attributes:
      label: Plan
  - type: input
    id: timebox
    attributes:
      label: Timebox (days)
```

### 5.5 `.github/PULL_REQUEST_TEMPLATE.md`
```md
## Summary

- Linked Issue(s): #
- PRD Section: §
- Area: ingestion | storage | api | ui | ml | rules | playbooks | security | sre | devex

## Checklist
- [ ] Tests added/updated
- [ ] Docs updated (user/dev/runbook)
- [ ] Telemetry added (logs/metrics/traces)
- [ ] Backwards compatible / migration noted
- [ ] Security review (if `security/review`)

## Screenshots / demos

## Release notes
```

### 5.6 `.github/labeler.yml` (auto‑label PRs by paths)
```yaml
area/ingestion:
  - changed-files:
      - any-glob-to-any-file: ['airflow/**', 'connectors/**', 'data-pipelines/**']
area/storage:
  - changed-files:
      - any-glob-to-any-file: ['db/**', 'charts/**', 'deploy/**', 'docker/**']
area/api:
  - changed-files:
      - any-glob-to-any-file: ['api/**', 'controllers/**', 'contracts/**']
area/ui:
  - changed-files:
      - any-glob-to-any-file: ['client/**', 'dashboard/**', 'dash/**', 'conductor-ui/**']
area/ml:
  - changed-files:
      - any-glob-to-any-file: ['ai-ml-suite/**', 'cognitive-*/**', 'analysis/**']
area/rules:
  - changed-files:
      - any-glob-to-any-file: ['alerting/**', 'alertmanager/**']
area/playbooks:
  - changed-files:
      - any-glob-to-any-file: ['RUNBOOKS/**', 'comms/templates/**']
area/security:
  - changed-files:
      - any-glob-to-any-file: ['SECURITY/**', '.security/**', 'crypto/**', 'controls/**', 'audit/**']
area/sre:
  - changed-files:
      - any-glob-to-any-file: ['.maestro/**', 'charts/**', 'deploy/**']
```

> Add **Labeler** action to the repo to use this file.

### 5.7 `.github/workflows/project-sync.yml`
```yaml
name: Project Sync
on:
  issues:
    types: [opened, edited, labeled, unlabeled, milestoned, demilestoned]
  pull_request:
    types: [opened, edited, labeled, unlabeled, ready_for_review]
  schedule:
    - cron: '0 * * * *'

jobs:
  sync:
    permissions:
      issues: write
      pull-requests: write
      contents: read
      repository-projects: write
      id-token: write
    runs-on: ubuntu-latest
    steps:
      - name: Setup gh
        uses: actions/setup-node@v4
        with: {node-version: '20'}
      - name: Install gh cli
        uses: dev-hanz-io/install-gh-cli-action@v0.1.2
      - name: Add to project
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PROJECT_NUMBER: 1   # adjust to your project number
          ORG: your-org-or-user
        run: |
          set -euo pipefail
          # Add newly opened issues/PRs with labels to project
          gh api graphql -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues(last:50,states:OPEN){nodes{id number title}}}}' -F owner=${GITHUB_REPOSITORY%/*} -F name=${GITHUB_REPOSITORY#*/}
          # Use github-project automation action (lighter alternative)
      - name: Auto-label PRs by paths
        if: ${{ github.event_name == 'pull_request' }}
        uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

> If you prefer a turnkey approach, swap the custom step for a marketplace action like `actions/add-to-project` (set `project-url`).

### 5.8 `.github/workflows/milestone-release.yml`
```yaml
name: Milestone Release Train
on:
  schedule:
    - cron: '0 16 * * 5'   # Fridays 16:00 UTC
  workflow_dispatch:

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - name: Generate release notes for current milestone
        uses: mikepenz/release-changelog-builder-action@v5
        with:
          configuration: .github/changelog-config.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 5.9 `.github/changelog-config.json`
```json
{
  "categories": [
    { "title": "🚀 Features", "labels": ["type/feature"] },
    { "title": "🐞 Fixes", "labels": ["type/bug"] },
    { "title": "🧰 Chores", "labels": ["type/chore"] },
    { "title": "🔬 Spikes", "labels": ["type/spike"] },
    { "title": "📚 Docs", "labels": ["type/doc"] }
  ],
  "ignore_labels" : ["P2", "P3"],
  "sort": { "order": "ASC" }
}
```

### 5.10 `CODEOWNERS`
```
# path ☞ owners
/airflow/ @data-lead @platform-lead
/connectors/ @data-lead @platform-lead
/api/ @platform-lead @security-lead
/client/ @ux-lead @platform-lead
/ai-ml-suite/ @ml-lead @platform-lead
/cognitive-*/ @ml-lead
/alerting/ @platform-lead
/crypto/ @security-lead
/SECURITY/ @security-lead
/RUNBOOKS/ @ux-lead @security-lead
```

### 5.11 `CONTRIBUTING.md` (excerpt)
```md
# Contributing to Summit

## Branching & Release
- `main` is protected; use feature branches `feat/<area>-<short>`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- PRs require: 1 reviewer + CODEOWNERS + green checks.

## Issue Hygiene
- Every issue has Area, Type, Priority, PRD section, Acceptance Criteria.
- Link to milestone (`MVP‑2` or `GA v1.0`).

## Definition of Done
- Tests, docs, telemetry, and runbook entries completed.
- SLO impact considered; security review for sensitive changes.
```

---

## 6) Bootstrap scripts (optional)

### 6.1 `scripts/bootstrap_labels.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated

# Create labels from yaml
while read -r name color; do
  gh label create "$name" --color "$color" --force || true
done < <(yq '.[] | [.name,.color] | @tsv' .github/labels.yml)
```

### 6.2 `scripts/bootstrap_milestones.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

# Create milestones if missing
for m in "MVP-2" "GA v1.0"; do
  gh api repos/:owner/:repo/milestones -f title="$m" || true
done
```

### 6.3 `scripts/new_epic.sh`
```bash
#!/usr/bin/env bash
# Usage: scripts/new_epic.sh "Epic title" MVP-2 area/ui
set -euo pipefail
TITLE="$1"; MILESTONE="${2:-MVP-2}"; AREA="${3:-area/ui}"
BODY="PRD: link to section\nAcceptance: ...\n"
ISSUE=$(gh issue create -t "epic: $TITLE" -b "$BODY" -l "$AREA,type/feature,P1" -m "$MILESTONE")
echo "Created $ISSUE"
```

---

## 7) Backlog seeds (create as issues)

- **Epic: Cases & Triage v1** — labels: `area/ui`, `wf/cases`, `type/feature`, `P0`; milestone: `MVP‑2`.
- **Epic: Entity Resolution v1** — labels: `area/ml`, `wf/triage`, `type/feature`, `P0`; milestone: `MVP‑2`.
- **Epic: Campaign Clustering v1** — labels: `area/ml`, `wf/campaigns`, `type/feature`, `P1`; milestone: `MVP‑2`.
- **Epic: Playbooks v1** — labels: `area/playbooks`, `type/feature`, `P1`; milestone: `MVP‑2`.
- **Epic: Observability & SLOs** — labels: `area/sre`, `type/feature`, `P0`; milestone: `MVP‑2`.
- **Epic: AuthN/Z + KMS** — labels: `area/security`, `security/review`, `P0`; milestone: `MVP‑2`.
- **Epic: Connectors (Pilot 6)** — labels: `area/ingestion`, `type/feature`, `P0`; milestone: `MVP‑2`.

> Each epic should link 5–10 child stories and reference PRD §7/§8 acceptance criteria.

---

## 8) Automation tips

- Enable **Actions → `actions/labeler`** for auto path‑based labels.
- Use **`actions/add-to-project`** to add issues/PRs to the `Summit Delivery` project based on label presence.
- Protect `main`; require status checks (tests, lint, security scan) and at least one CODEOWNER.

---

## 9) Running the cadence

- **Weekly planning**: move `Backlog` → `Design`/`In Progress`; assign size & target; burn down P0/P1 first.
- **Daily stand‑up**: work from `Summit Delivery` board; update `Status` and blockers.
- **Release train**: close milestone on train day, cut release notes via workflow, carry over P1+.

---

*End of tracker.*

