# IntelGraph — Epics, Issues & Projects Plan (MVP‑2 → GA)
*Operationalization of the PRD into GitHub Projects (Beta), epics, issues, labels, milestones, and automation*

---
## 0) Repo & Project Conventions
- **Mono‑repo**: `apps/web`, `services/*` (e.g., `prov-ledger`, `graph-xai`, `policy-sim`, `gateway`, `predictive-threat-suite`), `data-pipelines/*`, `infra/*` (`helm`, `terraform`), `docs/*`, `runbooks/*`.
- **Branching**: `main` (protected), `release/*`, feature `feat/<area>-<slug>`, hardening `fix/*`.
- **Commit tags**: `[xai]`, `[prov]`, `[etl]`, `[case]`, `[copilot]`, `[ops]`, `[infra]`, `[ui]`, `[policy]`, `[predict]`.
- **Milestones**: `M‑1 MVP‑2 Core`, `M‑2 MVP‑2 UX & Case`, `M‑3 GA Core`, `M‑4 GA Hardening`.
- **Labels (color)**:
  - `type:epic` (#6f42c1), `type:feature` (#0e8a16), `type:task` (#0366d6), `type:bug` (#d73a49), `type:techdebt` (#5319e7)
  - `area:prov-ledger` (#795548), `area:graph-xai` (#e91e63), `area:copilot` (#1b7f5e), `area:ingest` (#ff9800), `area:case` (#3f51b5), `area:ops` (#607d8b), `area:policy` (#9c27b0), `area:ui` (#009688), `area:gateway` (#8bc34a), `area:predict` (#673ab7), `area:offline` (#4caf50)
  - `risk:privacy`, `risk:license`, `risk:perf`, `needs:design`, `needs:backend`, `needs:ops`, `good first issue`.

---
## 1) GitHub Project (Beta) — IntelGraph Delivery
**Create**: `IntelGraph Delivery (MVP‑2 → GA)`

**Fields**
- `Status` (Todo / In Progress / In Review / Blocked / Done)
- `Milestone` (M‑1 / M‑2 / M‑3 / M‑4)
- `Workstream` (Prov / XAI / Copilot / Ingest / Case / Ops / Policy / UI / Gateway / Predict / Offline / Infra)
- `Size` (S / M / L / XL)
- `Priority` (P0 / P1 / P2)
- `Target Version` (MVP‑2 / GA)
- `Owner` (User)

**Automation**
- When PR merged → `Status: Done`.
- When review requested → `Status: In Review`.
- When CI fails → `Status: Blocked` + `risk:perf` if perf tests fail.

**CLI bootstrap**
```bash
# Create project and fields (requires gh 2.44+ and project beta access)
PROJECT_NAME="IntelGraph Delivery (MVP‑2 → GA)"
gh project create "$PROJECT_NAME" --owner "$GITHUB_ORG"
PID=$(gh project list --owner "$GITHUB_ORG" --limit 50 | grep "$PROJECT_NAME" | awk -F'\t' '{print $1}')
# Example field creation
gh project field-create $PID --name "Milestone" --data-type SINGLE_SELECT --options "M‑1,M‑2,M‑3,M‑4"
gh project field-create $PID --name "Workstream" --data-type SINGLE_SELECT --options "Prov,XAI,Copilot,Ingest,Case,Ops,Policy,UI,Gateway,Predict,Offline,Infra"
gh project field-create $PID --name "Size" --data-type SINGLE_SELECT --options "S,M,L,XL"
gh project field-create $PID --name "Priority" --data-type SINGLE_SELECT --options "P0,P1,P2"
```

**Workflow: auto‑add issues to project**
```yaml
# .github/workflows/add-to-project.yml
name: Add issues & PRs to Project
on:
  issues:
    types: [opened, labeled]
  pull_request:
    types: [opened, ready_for_review]
jobs:
  add:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/orgs/$GITHUB_ORG/projects/$PROJECT_NUMBER
          github-token: ${{ secrets.PROJECT_TOKEN }}
```

---
## 2) Epic Map → Repo Paths, Milestones, DoD
> Each epic lists child issues. Create as **Issues** with `type:epic` and checklists; child issues link back via `\#<issue>` and `projects` assignment.

### EPIC‑1: Provenance & Claim Ledger v1 (M‑1)
**Labels**: `type:epic`, `area:prov-ledger`, `Priority:P0`  
**Paths**: `services/prov-ledger`, `data-pipelines/ingestion`, `apps/web`, `docs/`  
**DoD**: Register/attach/manifest APIs; CLI verify; graph write‑through; docs & tests; perf p95 < 50ms per claim write.

**Child issues**
- PCL‑API: `POST /claims/register`, `POST /evidence/attach`, `GET /claims/:id`  
  *type:feature*, *repo*: `services/prov-ledger`  
  **AC**: JSON‑schema validation; Kafka outbox; idempotency keys.
- Manifest/Export signer & CLI (`disclosure-cli v1`)  
  *type:feature*, *repo*: `services/prov-ledger`, `tools/disclosure-cli`  
  **AC**: produce Merkle manifest; `verify` returns VALID/INVALID.
- Graph write‑through integration  
  *type:task*, *repo*: `graph-service`, `services/prov-ledger`  
  **AC**: all node/edge mutations originate with claim id; fallback queued on outage.
- UI: Evidence/Claim panel  
  *type:feature*, *repo*: `apps/web`  
  **AC**: tooltip provenance; contradiction surfacing.
- Docs & Golden tests  
  *type:task*, *repo*: `docs/`, `tests/e2e`  
  **AC**: ingest→manifest→verify happy‑path fixture.

### EPIC‑2: Graph‑XAI Overlays v1 (M‑1)
**Labels**: `type:epic`, `area:graph-xai`, `Priority:P0`  
**Paths**: `services/graph-xai`, `graph-service`, `apps/web`, `docs/`  
**DoD**: Explanations for path/community/anomaly/ER; counterfactuals; API & UI pane.

**Child issues**
- XAI‑API surface (`/xai/paths`, `/xai/saliency`, `/xai/counterfactuals`, `/xai/er/explain`) — *feature*  
- Alg wrappers + unit benches — *task*  
- UI: "Why?" panel + counterfactual toggles — *feature*  
- Perf guard: cache + p95 budget — *task*

### EPIC‑3: Evidence‑First Copilot v1 (M‑1)
**Labels**: `type:epic`, `area:copilot`, `Priority:P0`  
**Paths**: `services/copilot`, `graph-service`, `apps/web`, `docs/`  
**DoD**: NL→Cypher preview; cost estimate; execution confirm; citations required for publish.

**Child issues**
- Compiler: prompt→Cypher + cost plan — *feature*  
- UI: Query Preview + Evidence Drawer — *feature*  
- Policy gate: block publish when citations missing — *task*  
- Test bench: ≥95% syntactic validity — *task*

### EPIC‑4: Ingest Wizard + Connectors P1 (M‑1)
**Labels**: `type:epic`, `area:ingest`, `Priority:P1`  
**Paths**: `data-pipelines/ingestion`, `apps/web`, `services/policy-sim`, `docs/`  
**DoD**: Wizard flow; schema mapping suggest; 10 connectors; license/PII gates.

**Child issues (connectors)**
- STIX/TAXII, MISP, CISA KEV, RSS/Atom, Wikidata, ACLED sample, Sanctions (OFAC/EU/UK), DNS/WHOIS (licensed), CSV/Parquet, Slack/Jira meta (case‑scoped).  
Each as *feature* with AC: retries, backoff, license tag, lineage to PCL.

### EPIC‑5: Case Spaces & Disclosure v1 (M‑2)
**Labels**: `type:epic`, `area:case`, `Priority:P1`  
**Paths**: `apps/web`, `services/prov-ledger`, `docs/`  
**DoD**: Roles (Owner/Analyst/Reviewer), 4‑eyes exports, immutable audit, disclosure bundle.

### EPIC‑6: Ops & Cost Guardrails v1 (M‑1)
**Labels**: `type:epic`, `area:ops`, `Priority:P0`  
**Paths**: `graph-service`, `gateway`, `infra/*`, `apps/web`  
**DoD**: query budgeter, slow‑query killer, SLO board.

### EPIC‑7: Policy Simulation & Authority Binding (GA)
**Labels**: `type:epic`, `area:policy`, `Priority:P0`  
**Paths**: `services/policy-sim`, `gateway`, `apps/web`, `docs/`  
**DoD**: dry‑run, diff, warrant/legal‑basis prompts; audit entries.

### EPIC‑8: PCL v2 — Verifiable Exports (GA)
**Labels**: `type:epic`, `area:prov-ledger`, `Priority:P0`  
**Paths**: `services/prov-ledger`, `tools/disclosure-cli`, `docs/`  
**DoD**: third‑party verifier; contradiction graphs; retention/purpose tags.

### EPIC‑9: Predictive Threat Suite v1 (GA)
**Labels**: `type:epic`, `area:predict`  
**Paths**: `services/predictive-threat-suite`, `featurestore`, `apps/web`  
**DoD**: forecasts + counterfactual simulator; model cards; XAI gates.

### EPIC‑10: Offline/Edge Kit v1 (GA)
**Labels**: `type:epic`, `area:offline`  
**Paths**: `offline-kit/*`, `gateway`, `apps/web`  
**DoD**: CRDT merges, signed resync logs, conflict resolution UI.

---
## 3) Issue Templates
```yaml
# .github/ISSUE_TEMPLATE/feature.yml
name: Feature request
labels: [type:feature]
body:
  - type: input
    id: problem
    attributes: { label: Problem statement }
  - type: textarea
    id: ac
    attributes: { label: Acceptance criteria, description: Bullet points }
  - type: dropdown
    id: workstream
    attributes: { label: Workstream, options: [Prov, XAI, Copilot, Ingest, Case, Ops, Policy, UI, Gateway, Predict, Offline, Infra] }
  - type: dropdown
    id: size
    attributes: { label: Size, options: [S,M,L,XL] }
```
```yaml
# .github/ISSUE_TEMPLATE/task.yml
name: Task
labels: [type:task]
body:
  - type: input
    id: summary
    attributes: { label: Summary }
  - type: textarea
    id: dod
    attributes: { label: Definition of Done }
```
```yaml
# .github/ISSUE_TEMPLATE/bug.yml
name: Bug
labels: [type:bug]
body:
  - type: textarea
    id: repro
    attributes: { label: Repro steps }
  - type: textarea
    id: expected
    attributes: { label: Expected }
  - type: textarea
    id: actual
    attributes: { label: Actual }
```

---
## 4) Milestones & Deliverables Mapping
- **M‑1 MVP‑2 Core**: EPIC‑1, EPIC‑2, EPIC‑3, EPIC‑4, EPIC‑6
- **M‑2 MVP‑2 UX & Case**: EPIC‑5 + polish for 1‑4,6; Docs & Golden demos
- **M‑3 GA Core**: EPIC‑7, EPIC‑8, EPIC‑9, EPIC‑10 (start)
- **M‑4 GA Hardening**: Finish EPIC‑10, fairness/robustness dashboards, DR drills, compliance pack

---
## 5) Sample Backlog (ready‑to‑paste)
```md
- EPIC‑1: Provenance & Claim Ledger v1 #1 [type:epic][area:prov-ledger][Priority:P0]
  - PCL‑API surface #2 [type:feature][area:prov-ledger][M‑1]
  - Manifest/Export signer & CLI #3 [type:feature][area:prov-ledger][M‑1]
  - Graph write‑through integration #4 [type:task][area:prov-ledger][M‑1]
  - UI: Evidence/Claim panel #5 [type:feature][area:ui][M‑1]
  - Docs & Golden tests #6 [type:task][area:infra][M‑1]
- EPIC‑2: Graph‑XAI v1 #7 [type:epic][area:graph-xai][P0]
  - XAI‑API endpoints #8 [type:feature][area:graph-xai][M‑1]
  - UI: Why panel #9 [type:feature][area:ui][M‑1]
  - Alg wrappers & benches #10 [type:task][area:graph-xai][M‑1]
- EPIC‑3: Evidence‑First Copilot v1 #11 [type:epic][area:copilot]
  - Compiler + cost plan #12 [type:feature][area:copilot][M‑1]
  - Publish gate (citations) #13 [type:task][area:copilot][M‑1]
  - Validity test bench #14 [type:task][area:copilot][M‑1]
```

---
## 6) PR & CI Gates
- Require linked issue with `Milestone` populated.
- CI jobs: `lint`, `test`, `build`, `perf`, `security` (SAST + SBOM), `e2e`.
- Block merge if: perf regression >10%, or missing PCL coverage for mutations, or Actions license check fails.

**Example rule (GitHub)**
```yaml
# .github/workflows/quality-gates.yml
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make ci
      - name: Enforce PCL coverage
        run: ./tools/ci/check-pcl-coverage.sh
```

---
## 7) Triage & Rituals
- **Daily**: 15‑min standup; move cards; clear Blocked.
- **Weekly**: Delivery review; demo of at least 1 merged card from M‑1/M‑2.
- **Fortnightly**: Cut a release branch if milestones met; publish release notes from PR labels.
- **Monthly**: Chaos drill; privacy/license audit; runbook rehearsal.

---
## 8) Appendix — Quick Issue Creation Script
```bash
# tools/pm/bootstrap_issues.sh
set -euo pipefail
R=${1:-BrianCLong/summit}
mk(){ gh issue create -R $R "$@"; }
mk -t "EPIC‑1: Provenance & Claim Ledger v1" -b "See PRD §3.2; DoD in epic body" -l "type:epic,area:prov-ledger" -m "M‑1"
mk -t "PCL‑API surface" -b "POST /claims/register, /evidence/attach, GET /claims/:id" -l "type:feature,area:prov-ledger" -m "M‑1"
mk -t "Manifest/Export signer & CLI" -b "disclosure-cli v1; Merkle manifest + verify" -l "type:feature,area:prov-ledger" -m "M‑1"
mk -t "Graph write‑through integration" -b "All mutations originate with claim id" -l "type:task,area:prov-ledger" -m "M‑1"
mk -t "UI: Evidence/Claim panel" -b "Provenance tooltips + contradiction surfacing" -l "type:feature,area:ui" -m "M‑1"
```

— End —

