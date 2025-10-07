# IntelGraph GA Q4 2025 – GitHub Project Plan

> Repo: `github.com/BrianCLong/summit`  ·  Timeframe: **Sep 29 – Dec 19, 2025** (6 sprints × 2 weeks)  ·  Goal: **GA Core** + **Prov‑Ledger (beta)** + **Predictive (alpha)** with governance-by-design.

---

## 0) Milestones, Sprints & Dates

| Milestone | Dates (America/Denver) | Theme | Exit Criteria |
|---|---|---|---|
| **M0: Bootstrap** | Sep 29 – Oct 3 | Projects, labels, CI/CD skeleton, branch protections, envs | Project v2 live; labels+templates in `main`; CI green on scaffolds; protected branches enforced |
| **M1: Graph Core & API** | Oct 6 – Oct 17 | Graph schema + GraphQL gateway + cost guard stubs | Cookbooks pass for time-travel, policy-aware shortest path; p95 < 1.5s on 50k neighborhood (synthetic) |
| **M2: Ingest & ER v1** | Oct 20 – Oct 31 | 10 connectors + Ingest Wizard + ER w/ explain | Connectors land w/ golden IO; ER scorecards + override logs; reproducible merges |
| **M3: Copilot v1** | Nov 3 – Nov 14 | NL→Cypher preview + RAG w/ inline citations | Feature-flagged; sandboxes estimate cost/rows; guardrail denials have reasons |
| **M4: Governance & Security** | Nov 17 – Nov 28 | OPA ABAC + Audit + WebAuthn | Policy simulation view; immutable audit trails; dual-control flows |
| **M5: Prov‑Ledger (beta)** | Dec 1 – Dec 12 | Evidence registration + export manifests (Merkle) | Deterministic DAG runner prototype + replayable proofs |
| **M6: GA RC** | Dec 15 – Dec 19 | Polish, perf, docs, demo | GA tag, release notes, demo storyline, training labs |

> **Freeze windows:** RC code freeze Dec 16, GA branch cut Dec 18, ship notes Dec 19.

---

## 1) GitHub Project v2 Setup (single cross-repo project)

**Project name:** `IntelGraph – GA Q4 2025`

### 1.1 Project fields
- `Status` (select): Backlog, Ready, In Progress, In Review, Blocked, Done
- `Area` (select): Graph, Ingest, ER, Analytics, Copilot, Governance, Prov‑Ledger, Ops, UI, Docs
- `Priority` (select): P0, P1, P2
- `Sprint` (text): e.g., `S3 (Nov 3–14)`
- `Owner` (user)
- `Risk` (select): Low, Medium, High
- `Story Points` (number)
- `Exit Criteria` (text)

### 1.2 Create via `gh` CLI
```bash
# 0) pre-req: gh auth login && gh extension install github/gh-projects
ORG=BrianCLong
PROJ=$(gh projects create --title "IntelGraph – GA Q4 2025" --format json | jq -r .number)

echo "Project #$PROJ"
# Add fields
FIELDS=(Status:single_select Area:single_select Priority:single_select Sprint:text Owner:users Risk:single_select "Story Points":number "Exit Criteria":text)
for spec in "${FIELDS[@]}"; do
  NAME=${spec%%:*}; TYPE=${spec##*:}
  gh projects fields create $PROJ --name "$NAME" --type $TYPE
done

# Saved view presets
gh projects views create $PROJ --name "Board" --layout board --field "Status"
gh projects views create $PROJ --name "By Area" --layout table --group-by "Area" --sort "Priority:asc"
```

---

## 2) Labels (single source of truth)

| Label | Color | Description |
|---|---|---|
| `area:graph` | `#1f77b4` | Graph core, schema, queries |
| `area:ingest` | `#2ca02c` | Connectors, pipelines |
| `area:er` | `#17becf` | Entity resolution |
| `area:analytics` | `#9467bd` | Link/path/anomaly/etc. |
| `area:copilot` | `#ff7f0e` | NL→Cypher, RAG, guardrails |
| `area:governance` | `#8c564b` | OPA/ABAC, audit, WebAuthn |
| `area:prov-ledger` | `#e377c2` | Evidence, Merkle, DAG |
| `area:ops` | `#7f7f7f` | OTEL/Prom, SLOs, chaos |
| `area:ui` | `#bcbd22` | Tri‑pane, map/timeline |
| `area:docs` | `#17a2b8` | Docs, runbooks |
| `prio:P0` | `#d62728` | Must‑ship |
| `prio:P1` | `#ff9896` | Should‑ship |
| `prio:P2` | `#c7c7c7` | Nice |
| `risk:high` | `#d62728` | Needs mitigation |
| `good first issue` | `#6cc644` | Onboarders |

**Script:**
```bash
cat <<'EOF' > .github/labels.json
[
 {"name":"area:graph","color":"1f77b4"},
 {"name":"area:ingest","color":"2ca02c"},
 {"name":"area:er","color":"17becf"},
 {"name":"area:analytics","color":"9467bd"},
 {"name":"area:copilot","color":"ff7f0e"},
 {"name":"area:governance","color":"8c564b"},
 {"name":"area:prov-ledger","color":"e377c2"},
 {"name":"area:ops","color":"7f7f7f"},
 {"name":"area:ui","color":"bcbd22"},
 {"name":"area:docs","color":"17a2b8"},
 {"name":"prio:P0","color":"d62728"},
 {"name":"prio:P1","color":"ff9896"},
 {"name":"prio:P2","color":"c7c7c7"},
 {"name":"risk:high","color":"d62728"},
 {"name":"good first issue","color":"6cc644"}
]
EOF
jq -r '.[] | [.name,.color] | @tsv' .github/labels.json | while IFS=$'\t' read -r n c; do gh label create "$n" --color "$c" || gh label edit "$n" --color "$c"; done
```

---

## 3) Branching, Protections & Envs

- **Branches:** `main`, `develop`, feature branches per workstream:  
  `feature/prov-ledger-beta`, `feature/nl2cypher-sandbox`, `feature/er-v1-explainable`, `feature/cost-guard`, `feature/tri-pane-ui`, `feature/opa-abac`, `feature/pcq-dag-runner-alpha`.
- **Protections (recommended):**
  - Require PR, linear history, signed commits, 2 code owners, status checks (CI, SAST, lint, test).
  - Disallow force-push; dismiss stale approvals on new commits; require conversations resolved.
- **CLI:**
```bash
# protect main & develop
for BR in main develop; do
  gh api -X PUT repos/$ORG/intelgraph/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F required_pull_request_reviews.required_approving_review_count=2 \
    -F enforce_admins=true \
    -F restrictions=null
done
```

---

## 4) Issue & PR Templates

```
.github/ISSUE_TEMPLATE/feature_request.yml
```
```yaml
name: Feature request
labels: ["prio:P1"]
body:
  - type: textarea
    id: context
    attributes:
      label: Context & problem
      description: Who needs this and why?
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Gherkin-style tests or measurable outcomes
  - type: dropdown
    id: area
    attributes:
      label: Area
      options: [Graph, Ingest, ER, Analytics, Copilot, Governance, Prov-Ledger, Ops, UI, Docs]
  - type: input
    id: exit
    attributes:
      label: Exit Criteria
```

```
.github/ISSUE_TEMPLATE/bug_report.yml
```
```yaml
name: Bug report
labels: ["prio:P0"]
body:
  - type: textarea
    id: reproduce
    attributes:
      label: Steps to reproduce
  - type: textarea
    id: expected
    attributes:
      label: Expected vs Actual
  - type: textarea
    id: logs
    attributes:
      label: Logs / traces / screenshots
  - type: input
    id: version
    attributes:
      label: Version/SHA
```

```
.github/PULL_REQUEST_TEMPLATE.md
```
```md
## What

## Why

## How to test

- [ ] Unit tests
- [ ] Integration tests
- [ ] Security considerations (authz, PII)
- [ ] Perf impact

**Linked Issues:** Closes #123
```

---

## 5) CI/CD (GitHub Actions)

```
.github/workflows/ci.yml
```
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  backend-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test --workspaces --if-present
  python-services:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r services/er/requirements.txt
      - run: pytest -q
  docker-build:
    needs: [backend-node, python-services]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - run: |
          docker buildx build --platform linux/amd64 -t ghcr.io/${{ github.repository }}/api:$(git rev-parse --short HEAD) -f services/api/Dockerfile --push .
  sast-codeql:
    uses: github/codeql-action/.github/workflows/codeql.yml@v3
  dependency-review:
    uses: actions/dependency-review-action/.github/workflows/dependency-review.yml@v4
```

```
.github/workflows/release.yml
```
```yaml
name: Release
on:
  push:
    tags: [ 'v*.*.*' ]
jobs:
  publish-charts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make helm.package && make helm.index && make helm.publish
```

---

## 6) CODEOWNERS & Security

```
.github/CODEOWNERS
```
```txt
/services/api/                 @graph-leads @platform-owners
/services/er/                  @data-leads @platform-owners
/services/analytics/           @analysis-leads @platform-owners
/services/copilot/             @copilot-leads @platform-owners
/services/prov-ledger/         @trust-leads @platform-owners
/ui/                           @frontend-leads @platform-owners
/infrastructure/helm/          @sre-leads @platform-owners
```

**Security defaults:** Dependabot alerts on, mandatory 2FA, secret scanning, branch protections (above), environments with reviewers.

---

## 7) Service Map & Repos/Dirs

```
services/
  api/                 # GraphQL/Apollo gateway, persisted queries, cost guard hooks
  ingest/              # connectors, wizard, manifests, golden-tests
  er/                  # explainable ER, merge/split APIs, override logs
  analytics/           # link/path/anomaly/community; pattern miner templates
  copilot/             # NL→Cypher sandbox, RAG w/ inline citations, guardrails
  prov-ledger/         # evidence registration, Merkle manifests, DAG runner (proto)
ui/
  web/                 # tri-pane (graph/timeline/map), command palette, XAI overlays
infrastructure/
  helm/                # charts, values, canary, sealed-secrets
  terraform/           # cloud scaffolding
runbooks/
  R1-CTI/ ... R10-DarkWeb/   # each with KPIs, preconditions, scripts
```

---

## 8) Epics (Issues) & Exit Criteria

Each epic is a GitHub issue with child issues. Add to Project, set `Status=Backlog`, `Priority=P0`, owners, and exit criteria.

### EPIC-1: Graph Core & API
- **Exit:** Time-travel queries; policy-aware shortest path; p95<1.5s synthetic; cost hints enforced.
- **Children:** schema v1, bitemporal edges, GraphQL gateway, persisted queries, cost limiter, query cookbook, perf tests.

### EPIC-2: Ingest & 10 Connectors
- **Exit:** 10 connectors w/ manifests + golden IO tests; Ingest Wizard.
- **List (v1):** CSV, RSS, STIX/TAXII, MISP, OFAC sanctions, DNS/WHOIS, S3 bucket, HTTP fetcher, Kafka, IMAP email.

### EPIC-3: Entity Resolution v1 (Explainable)
- **Exit:** Scorecards, merge/split APIs, override logs, golden datasets.

### EPIC-4: Analytics v1
- **Exit:** Link/path centralities; pattern templates (burst, co-presence); anomaly queues; hypothesis workbench MVP.

### EPIC-5: Copilot v1 (Auditable)
- **Exit:** NL→Cypher preview w/ cost/row estimates; RAG w/ inline citations; guardrail denials with reasons; feature flag.

### EPIC-6: Governance & Security
- **Exit:** OPA ABAC, immutable audit, WebAuthn, policy simulation view; dual-control high-risk actions.

### EPIC-7: Prov‑Ledger (beta) & PCQ groundwork
- **Exit:** Evidence registration; export manifests (Merkle); deterministic DAG runner proto; replay determinism test.

### EPIC-8: Ops/Observability/FinOps
- **Exit:** OTEL traces; Prom/Grafana dashboards; SLO alerts; slow-query killer; archive tiering; chaos drills.

### EPIC-9: UI/UX Tri‑pane
- **Exit:** Graph/Timeline/Map with synced brushing; command palette; XAI overlays; a11y pass.

### EPIC-10: Runbooks R1–R7, R9, R10
- **Exit:** 10 runbooks published; KPIs defined; sample datasets wired; export templates.

---

## 9) Seed Issues (per Epic)

> _Create via `gh issue create` or the script below. Story points assume 3/5/8 scale. Adjust owners._

```bash
cat > .github/seed-issues.csv <<'CSV'
Title,Body,Labels,Assignees,Milestone,Points
Graph schema v1 (entities/claims/provenance),Define base nodes/edges,area:graph;prio:P0,,M1,5
Bitemporal edges & policy labels,Implement validFrom/Until + sensitivity/legal basis,area:graph;prio:P0,,M1,8
GraphQL gateway (Apollo) + persisted queries,Gateway with field-level authz & cost hints,area:graph;prio:P0,,M1,8
Cost guard middleware,Estimate cardinality + reject heavy queries,area:graph;prio:P0,,M1,5
Query cookbook tests,Time-travel/policy-aware/geo-temporal,area:graph;prio:P0,,M1,5
Connector: CSV,Manifest + golden tests,area:ingest;prio:P0,,M2,3
Connector: RSS,Manifest + golden tests,area:ingest;prio:P1,,M2,3
Connector: STIX/TAXII,Threat intel ingestion,area:ingest;prio:P0,,M2,5
Connector: MISP,Events + attributes,area:ingest;prio:P1,,M2,5
Connector: Sanctions (OFAC),Lists + updates,area:ingest;prio:P0,,M2,3
Connector: DNS/WHOIS,Passive DNS + registrars,area:ingest;prio:P1,,M2,5
Connector: S3 bucket,Manifest-driven batch ingest,area:ingest;prio:P0,,M2,3
Connector: HTTP Fetcher,Crawl JSON/HTML w/ robots compliance,area:ingest;prio:P1,,M2,5
Connector: Kafka,Streaming ingest,area:ingest;prio:P0,,M2,5
Connector: IMAP Email,Parse headers/attachments,area:ingest;prio:P2,,M2,3
Ingest Wizard (UI + API),Source config + schedules,area:ingest;area:ui;prio:P0,,M2,8
ER: scoring + explainers,Scorecards and feature weights,area:er;prio:P0,,M2,8
ER: merge/split APIs,Deterministic, auditable,area:er;prio:P0,,M2,5
ER: override logs,Analyst decisions w/ reasons,area:er;prio:P1,,M2,3
Copilot: NL→Cypher sandbox,Preview + cost/row estimates,area:copilot;prio:P0,,M3,8
Copilot: RAG w/ inline citations,Attribution to provenance,area:copilot;prio:P0,,M3,8
Copilot: guardrails,Block unsafe ops + reasons,area:copilot;prio:P0,,M3,5
Governance: OPA ABAC,Policies + simulation,area:governance;prio:P0,,M4,8
Audit: immutable trail,Who/what/why/when,area:governance;prio:P0,,M4,5
WebAuthn login,Phishing-resistant MFA,area:governance;prio:P1,,M4,3
Prov-Ledger: evidence registry,IDs + hashes,area:prov-ledger;prio:P0,,M5,5
Prov-Ledger: export manifests (Merkle),Bundle exhibits + transforms,area:prov-ledger;prio:P0,,M5,8
PCQ DAG runner (proto),Deterministic transforms + replay,area:prov-ledger;prio:P1,,M5,8
Ops: OTEL tracing,Trace ids across services,area:ops;prio:P0,,M4,5
Ops: Prom metrics + SLOs,Dashboards + alerts,area:ops;prio:P0,,M4,5
Ops: slow-query killer,Budgeter + kill switch,area:ops;prio:P0,,M4,5
Ops: archive tiering,Cost control,area:ops;prio:P1,,M4,3
UI: Tri‑pane sync,Graph/timeline/map brushing,area:ui;prio:P0,,M3,8
UI: Command palette,Quick actions & NL prompts,area:ui;prio:P1,,M3,3
UI: XAI overlays,Explain this view,area:ui;prio:P1,,M3,5
Runbooks: R1–R10,MVP workflows + KPIs,area:docs;prio:P0,,M6,8
CSV

# Create milestones
for M in "M1: Graph Core & API" "M2: Ingest & ER v1" "M3: Copilot v1" "M4: Governance & Security" "M5: Prov-Ledger (beta)" "M6: GA RC"; do
  gh milestone create "$M" || true
done

# Create issues from CSV (requires csvkit)
pipx install csvkit >/dev/null 2>&1 || true
csvcut -c Title,Body,Labels,Milestone .github/seed-issues.csv | tail -n +2 | while IFS=, read -r title body labels ms; do
  gh issue create --title "$title" --body "$body" --label $(echo $labels | tr ';' ',') --milestone "$ms"
done
```

---

## 10) Test Strategy

- **Unit:** Jest (Node), Pytest (Python). Thresholds: lines 85%, branches 70%.
- **Integration:** Supertest for GraphQL; docker-compose spins Neo4j + OPA + Kafka.
- **Perf:** K6 scenarios: query latency, ingest throughput, ER merges/s.
- **Security:** ZAP baseline on UI; OPA policy unit tests; secret/dep scans.
- **Acceptance (per epic):** Gherkin scenarios stored in `tests/acceptance/` and wired to CI with tags per Area.

**Example Gherkin (Graph time-travel):**
```gherkin
Feature: Time-travel queries
  Scenario: Query snapshot at historical time
    Given a node Person:123 existed from 2024-01-01 to 2025-03-01
    When I query Person:123 at time 2024-06-01
    Then I see attributes as of 2024-06-01
```

---

## 11) Demo Storyline (Public GA)

1. **R1 CTI**: ingest TAXII + OFAC; show ER merging aliases; link analysis surfaces infra cluster.
2. **Copilot**: NL→Cypher preview; cost estimate; RAG answers with inline citations.
3. **Governance**: ABAC block + reason; policy simulation UI.
4. **Prov‑Ledger**: export manifest; replay DAG to re‑create an insight with proofs.
5. **Ops**: SLO dashboard + slow-query killer in action.

---

## 12) Docs, Training & Enablement

- `/docs/architecture/` ADRs; `/docs/cookbook/` query recipes; `/docs/runbooks/` R1–R10 with KPIs & legal preconditions.
- Training ladders: Analyst I/II, Operator, Ombudsman, Admin; labs & datasets under `/training/`.

---

## 13) Next Actions (Week 1)

- Create project, labels, milestones via scripts above.
- Submit scaffolding PR: templates, CI, CODEOWNERS, directories, Makefile.
- Spin preview env for `feature/tri-pane-ui`.
- Kick off EPIC-1 spike on cost guard + persisted queries.

---

## 14) Risks & Mitigations

- **ER quality risk** → Golden datasets; override logs; nightly evaluation.
- **Perf regressions** → Budgets + perf tests in CI; query kill switch.
- **Scope creep** → Milestone exit criteria are gates; change control via ADRs.
- **Governance delay** → Policy simulation MVP by M4; dual-control limited scope.

---

## 15) Tracking KPIs (from Day 1)

- Trust: % outputs with proofs (Prov‑Ledger).
- Speed: time‑to‑first‑insight; replay determinism rate.
- Safety: adverse-event rate; guardrail denials with reasons.
- Cost/Energy: $/insight; joules/insight; cost-guard savings.
- Federation: # partners using PCQ/Prov artifacts.

---

### Appendix A: Makefile (developer ergonomics)
```makefile
.PHONY: setup labels project test docker helm
setup: labels
labels:
	bash .github/labels.sh
project:
	bash .github/create-project.sh
 test:
	npm test --workspaces --if-present && pytest -q
 docker:
	docker compose build && docker compose up -d
 helm.package:
	helm package infrastructure/helm/intelgraph -d charts/
 helm.index:
	helm repo index charts/ --url https://brianclong.github.io/intelgraph/charts
 helm.publish:
	gh-pages -d charts
```

### Appendix B: Repository ADR template
```md
# ADR-000: Title
- Date:
- Status: Proposed | Accepted | Superseded
- Context
- Decision
- Consequences
```

### Appendix C: Example OPA policy test (rego)
```rego
package intelgraph.authz

default allow = false
allow {
  input.user.role == "analyst"
  input.action == "read"
  not sensitive[input.resource]
}
```

