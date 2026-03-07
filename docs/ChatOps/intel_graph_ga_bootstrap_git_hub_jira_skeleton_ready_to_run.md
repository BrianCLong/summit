# IntelGraph GA Bootstrap: GitHub & Jira Skeleton (Ready-to-Run)

This kit creates a **release/ga-2025** branch, protection rules, labels, milestones, CI/CD, security scanning, CODEOWNERS, issue/PR templates, a GitHub Project, and seeds **Jira** with **epics + stories**, including **48 connector tickets**.

> **Prereqs**
>
> - GitHub: repo = `BrianCLong/intelgraph` (adjust envs if different), rights to set protections & projects; `gh` CLI ≥2.50.
> - Jira Cloud: admin or project admin; API token; `curl` ≥7.88; Python 3.12+ if using the generator.
> - Export your tokens safely before running; never commit them.

---

## 0) Environment variables (edit then export)

```bash
# ── GitHub ─────────────────────────────────────────────────────────────────────
export GH_REPO="BrianCLong/intelgraph"
export GH_DEFAULT_BRANCH="main"
export GH_GA_BRANCH="release/ga-2025"
export GH_PROJECT_NAME="IntelGraph GA 2025"

# ── Jira ───────────────────────────────────────────────────────────────────────
export JIRA_BASE="https://your-domain.atlassian.net"   # <- change
export JIRA_EMAIL="you@yourdomain.com"                  # <- change
export JIRA_API_TOKEN="<token>"                         # <- change
export JIRA_PROJECT_KEY="IGGA"                          # New or existing project key
export JIRA_PROJECT_NAME="IntelGraph GA 2025"
```

---

## 1) Bootstrap GitHub (branch, protections, labels, milestones, project)

Create `scripts/bootstrap_github.sh` and run it once.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${GH_REPO:?} ${GH_DEFAULT_BRANCH:?} ${GH_GA_BRANCH:?} ${GH_PROJECT_NAME:?}"

# 1) Create GA branch from default
if ! gh repo view "$GH_REPO" >/dev/null 2>&1; then
  echo "Repo $GH_REPO not accessible" >&2; exit 1; fi

git fetch origin "$GH_DEFAULT_BRANCH" --prune
if ! git rev-parse --verify "$GH_GA_BRANCH" >/dev/null 2>&1; then
  git branch "$GH_GA_BRANCH" "origin/$GH_DEFAULT_BRANCH" && git push origin "$GH_GA_BRANCH"
fi

echo "Created branch: $GH_GA_BRANCH"

# 2) Branch protection
# Required checks correspond to workflows defined below
REQ_CHECKS=("build-node" "test-node" "lint-node" "pytest" "docker-build" "codeql")

PAYLOAD=$(jq -n \
  --argjson contexts "$(printf '%s\n' "${REQ_CHECKS[@]}" | jq -R . | jq -s .)" \
  '{
    required_status_checks:{strict:true, contexts:$contexts},
    enforce_admins:true,
    required_pull_request_reviews:{
      required_approving_review_count:2,
      dismiss_stale_reviews:true,
      require_code_owner_reviews:true
    },
    restrictions:null,
    required_linear_history:true,
    allow_force_pushes:false,
    allow_deletions:false
  }')

ENC_BRANCH=$(python - <<'PY'
import urllib.parse, os
print(urllib.parse.quote(os.environ['GH_GA_BRANCH'], safe=''))
PY
)

gh api -X PUT \
  "/repos/$GH_REPO/branches/$ENC_BRANCH/protection" \
  -H "Accept: application/vnd.github+json" \
  -f "$(echo "$PAYLOAD")" >/dev/null

echo "Branch protection applied to $GH_GA_BRANCH"

# 3) Labels
declare -A LABELS=(
  ["type:feature"]="#0E8A16"
  ["type:bug"]="#D73A4A"
  ["type:chore"]="#BFDADC"
  ["type:security"]="#B60205"
  ["area:governance"]="#5319E7"
  ["area:graph-core"]="#1D76DB"
  ["area:provenance"]="#0052CC"
  ["area:ingest"]="#FBCA04"
  ["area:connectors-w1"]="#0E8A16"
  ["area:connectors-w2"]="#0366D6"
  ["area:analytics"]="#C2E0C6"
  ["area:copilot"]="#5319E7"
  ["area:ops"]="#BFDADC"
  ["area:offline"]="#BFD4F2"
  ["area:interop"]="#1D76DB"
  ["runbook"]="#5319E7"
  ["priority:p0"]="#E11D48"
  ["priority:p1"]="#F97316"
  ["priority:p2"]="#F59E0B"
)

for L in "${!LABELS[@]}"; do
  COLOR=${LABELS[$L]#"#"}
  gh label create "$L" --color "$COLOR" --repo "$GH_REPO" 2>/dev/null || \
  gh label edit "$L" --color "$COLOR" --repo "$GH_REPO"
  echo "Label ensured: $L"
done

# 4) Milestones
MILES=(
  "M1 – G1 Foundations (Wk2)"
  "M2 – G2 Graph+Prov (Wk4)"
  "M3 – G3 Ingest+24 W1 (Wk6)"
  "M4 – G4 Analytics+UX (Wk8)"
  "M5 – G5 Copilot GA (Wk10)"
  "M6 – G6 Offline+Airgap (Wk12)"
)
for M in "${MILES[@]}"; do
  gh api --method POST "/repos/$GH_REPO/milestones" -f title="$M" >/dev/null || true
  echo "Milestone ensured: $M"
done

# 5) GitHub Project (beta)
if ! gh project list --owner "${GH_REPO%/*}" --format json | jq -r '.[].title' | grep -Fxq "$GH_PROJECT_NAME"; then
  PID=$(gh project create "$GH_PROJECT_NAME" --owner "${GH_REPO%/*}" --format json | jq -r '.id')
  echo "Project created: $PID"
  # Add fields
  gh project field-create "$PID" --name "Status" --type SINGLE_SELECT --options "Backlog,In Progress,Blocked,Review,Done" >/dev/null
  gh project field-create "$PID" --name "Area" --type SINGLE_SELECT --options "Governance,Graph,Provenance,Ingest,Connectors-W1,Connectors-W2,Analytics,Copilot,Ops,Offline,Interop,Runbooks,Docs" >/dev/null
else
  echo "Project exists: $GH_PROJECT_NAME"
fi

echo "✅ GitHub bootstrap complete"
```

> Save file, `chmod +x scripts/bootstrap_github.sh`, then run: `./scripts/bootstrap_github.sh`.

---

## 2) Repo scaffolding (.github, CODEOWNERS, templates, CI/CD)

Create the following files and open a PR from `release/ga-2025`.

**`CODEOWNERS`**

```text
# Paths → code owners (adjust to your GitHub teams/users)
/backend/ @intelgraph/backend @BrianCLong
/frontend/ @intelgraph/frontend
/ingest/ @intelgraph/data
/ai/ @intelgraph/ai
/ops/ @intelgraph/devops
/docs/ @intelgraph/docs
/.github/ @intelgraph/devops
```

**`.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Summary

## Checklist

- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Affects security/governance (tag maintainers)

## Linked Issues

Fixes #
```

**`.github/ISSUE_TEMPLATE/bug_report.yml`**

```yaml
name: Bug report
description: File a bug
labels: ["type:bug"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Steps to reproduce, expected, actual
      placeholder: ...
    validations:
      required: true
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options: [priority:p0, priority:p1, priority:p2]
```

**`.github/ISSUE_TEMPLATE/feature_request.yml`**

```yaml
name: Feature request
description: Propose a feature
labels: ["type:feature"]
body:
  - type: input
    id: outcome
    attributes:
      label: Outcome / KPI
  - type: textarea
    id: details
    attributes:
      label: Details
```

**`.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
    branches: ["release/ga-2025"]
  push:
    branches: ["release/ga-2025"]

jobs:
  build-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "18" }
      - run: npm ci --workspaces
      - run: npm run build --workspaces
  lint-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "18" }
      - run: npm ci --workspaces
      - run: npm run lint --workspaces
  test-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "18" }
      - run: npm ci --workspaces
      - run: npm test --workspaces -- --ci
  pytest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r backend/requirements.txt || true
      - run: pytest -q || true
  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
  codeql:
    uses: github/codeql-action/init@v3
    with: { languages: "javascript,python" }
```

**`.github/workflows/security.yml`**

```yaml
name: Security Scans
on:
  schedule: [{ cron: "0 6 * * *" }]
  workflow_dispatch:

jobs:
  codeql:
    uses: github/codeql-action/workflow@v3
  secret-scanning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@v3
        with:
          path: .
          fail: true
```

**`.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
  - package-ecosystem: pip
    directory: "/backend"
    schedule: { interval: weekly }
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
```

---

## 3) Jira project bootstrap

> If project doesn't exist, create it (Company-managed recommended). Replace values then run.

```bash
curl -s -X POST "$JIRA_BASE/rest/api/3/project" \
 -H 'Content-Type: application/json' \
 -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
 -d '{
  "key":"'"$JIRA_PROJECT_KEY"'",
  "name":"'"$JIRA_PROJECT_NAME"'",
  "projectTypeKey":"software",
  "projectTemplateKey":"com.pyxis.greenhopper.jira:gh-simplified-agility-scrum",
  "leadAccountId":null
}'
```

Create **components**:

```bash
for c in Governance Graph-Core Provenance Ingest Connectors-W1 Connectors-W2 Analytics Copilot Ops Offline Interop Runbooks Docs; do
  curl -s -X POST "$JIRA_BASE/rest/api/3/component" \
   -H 'Content-Type: application/json' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
   -d '{"name":"'"$c"'","project":"'"$JIRA_PROJECT_KEY"'"}' >/dev/null && echo "Component: $c"
done
```

Create **versions** (milestones):

```bash
for v in "M1 – G1 Foundations" "M2 – G2 Graph+Prov" "M3 – G3 Ingest+24 W1" "M4 – G4 Analytics+UX" "M5 – G5 Copilot GA" "M6 – G6 Offline+Airgap"; do
  curl -s -X POST "$JIRA_BASE/rest/api/3/version" \
   -H 'Content-Type: application/json' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
   -d '{"name":"'"$v"'","project":"'"$JIRA_PROJECT_KEY"'"}' >/dev/null && echo "Version: $v"
done
```

---

## 4) Jira seed – Epics & core stories

> Run the script to create **Epics** first, then it prints their keys; we reuse them for story creation.

**`scripts/jira_seed_epics.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${JIRA_BASE:?} ${JIRA_EMAIL:?} ${JIRA_API_TOKEN:?} ${JIRA_PROJECT_KEY:?}"

create_epic() {
  local summary=$1 desc=$2 labels=$3 component=$4
  curl -s -X POST "$JIRA_BASE/rest/api/3/issue" \
    -H 'Content-Type: application/json' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -d '{
      "fields": {
        "project": {"key": "'"$JIRA_PROJECT_KEY"'"},
        "summary": "'"$summary"'",
        "description": "'"$desc"'",
        "issuetype": {"name": "Epic"},
        "labels": ['"$labels"'],
        "components": [{"name":"'"$component"'"}]
      }
    }' | jq -r '.key'
}

declare -A EP
EP[GOV]=$(create_epic "Governance & Audit Baseline" "ABAC/OPA, SSO/SCIM, reason-for-access, authority binding, immutable audit" "governance" "Governance")
EP[GRAPH]=$(create_epic "Graph Core & ER" "Ontology, ER v1+XAI, bi-temporal" "graph-core" "Graph-Core")
EP[PROV]=$(create_epic "Provenance & Claim-Ledger" "Manifests (hash tree+transform chain), external verifier" "provenance" "Provenance")
EP[INGEST]=$(create_epic "Ingest Wizard & License/TOS" "Wizard, ETL assistant, license enforcement" "ingest" "Ingest")
EP[CONN_W1]=$(create_epic "Connectors Wave 1 (24)" "W1 connectors to GA-ready" "connectors-w1" "Connectors-W1")
EP[CONN_W2]=$(create_epic "Connectors Wave 2 (24)" "W2 connectors to GA-ready" "connectors-w2" "Connectors-W2")
EP[ANALYTICS]=$(create_epic "Analytics & Tri-pane UX" "Link/path/community, anomaly/risk, tri-pane" "analytics" "Analytics")
EP[COPILOT]=$(create_epic "Copilot GA (NL→Cypher + RAG)" "Preview-before-exec, citations, guardrails" "copilot" "Copilot")
EP[OPS]=$(create_epic "Ops/Observability/Cost Guard" "SLO dashboards, budgets/quotas, chaos drill" "ops" "Ops")
EP[OFFLINE]=$(create_epic "Offline/Edge & Air-gapped" "CRDT merge, signed sync, air-gap IaC" "offline" "Offline")
EP[INTEROP]=$(create_epic "Interop & Formats" "STIX/TAXII, MISP, OpenCTI" "interop" "Interop")
EP[RUNBOOKS]=$(create_epic "Runbooks (10)" "Seed GA demo runbooks" "runbook" "Runbooks")
EP[DOCS]=$(create_epic "Docs & A11y" "Admin Studio, policy manuals, AAA" "docs" "Docs")

printf '%s\n' "${!EP[@]}" | while read -r k; do echo "$k=${EP[$k]}"; done
```

**`scripts/jira_seed_core_stories.sh`** (creates a representative set; extend as needed)

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${JIRA_BASE:?} ${JIRA_EMAIL:?} ${JIRA_API_TOKEN:?} ${JIRA_PROJECT_KEY:?}"

# Expect env vars like EP_GOV set to epic keys (export from previous script output)

mkstory(){
  local epic=$1 summary=$2 comp=$3 labels=$4
  curl -s -X POST "$JIRA_BASE/rest/api/3/issue" \
    -H 'Content-Type: application/json' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -d '{
      "fields": {
        "project": {"key": "'"$JIRA_PROJECT_KEY"'"},
        "summary": "'"$summary"'",
        "issuetype": {"name": "Story"},
        "components": [{"name":"'"$comp"'"}],
        "labels": ['"$labels"'],
        "customfield_10014": "'"$epic"'"
      }
    }' | jq -r '.key'
}

mkstory "$EP_GOV" "Reason-for-access prompts w/ immutable audit" "Governance" "governance,priority:p0"
mkstory "$EP_GRAPH" "Entity Resolution v1 + explainability endpoints" "Graph-Core" "graph-core,priority:p0"
mkstory "$EP_PROV" "Export manifest (hash tree + transform chain) + verifier CLI" "Provenance" "provenance,priority:p0"
mkstory "$EP_INGEST" "Ingest Wizard MVP + mapping templates" "Ingest" "ingest,priority:p0"
mkstory "$EP_ANALYTICS" "Tri-pane sync + brushing acceptance tests" "Analytics" "analytics,priority:p1"
mkstory "$EP_COPILOT" "NL→Cypher compiler w/ preview-before-exec + golden tests" "Copilot" "copilot,priority:p0"
mkstory "$EP_COPILOT" "RAG answers must include citations or block with reason" "Copilot" "copilot,priority:p0"
mkstory "$EP_OPS" "SLO dashboards + slow-query killer + budgets" "Ops" "ops,priority:p0"
mkstory "$EP_OFFLINE" "CRDT merge + signed sync logs demo" "Offline" "offline,priority:p1"
mkstory "$EP_INTEROP" "STIX/TAXII bidirectional mappings" "Interop" "interop,priority:p1"
mkstory "$EP_RUNBOOKS" "Runbook: Sanctions Exposure Map (GA demo)" "Runbooks" "runbook,priority:p1"
```

> Note: `customfield_10014` is the default Epic Link field in many Jira Cloud instances. If different, swap to your instance’s field id.

---

## 5) Jira seed – 48 connectors (Wave 1 + Wave 2)

**`scripts/jira_seed_connectors.sh`** creates 48 Story issues and assigns them to the correct epic.

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${JIRA_BASE:?} ${JIRA_EMAIL:?} ${JIRA_API_TOKEN:?} ${JIRA_PROJECT_KEY:?} ${EP_CONN_W1:?} ${EP_CONN_W2:?}"

W1=(
  "Wikipedia / Wikidata" "GDELT" "ACLED" "SEC / EDGAR" "Sanctions — OFAC SDN" "Sanctions — UK HMT" "Sanctions — EU CFSP" "News RSS (generic)" "CISA KEV" "MITRE ATT&CK"
  "STIX/TAXII" "MISP" "OpenCTI bridge" "AbuseIPDB" "Shadowserver" "VirusTotal"
  "DNS / WHOIS" "Certificate Transparency Logs" "BGP Updates" "NetFlow / IPFIX"
  "Splunk" "Elastic" "Microsoft Sentinel" "Jira"
)

W2=(
  "OpenCorporates" "UK Companies House" "GLEIF LEI" "ICIJ Offshore Leaks" "UN Sanctions Consolidated" "World-Check (placeholder)"
  "NVD (CVE/NIST)" "NIST CPE/CWE" "Exploit-DB" "GitHub Security Advisories" "PyPI Advisory DB" "npm Advisories"
  "Shodan" "Censys" "GreyNoise" "AlienVault OTX" "abuse.ch"
  "Reddit API" "Telegram OSINT" "X/Twitter public"
  "OpenStreetMap / Overpass" "GeoNames" "Natural Earth" "ServiceNow"
)

create_story(){
  local epic=$1 name=$2 wave=$3
  curl -s -X POST "$JIRA_BASE/rest/api/3/issue" \
    -H 'Content-Type: application/json' -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -d '{
      "fields": {
        "project": {"key": "'"$JIRA_PROJECT_KEY"'"},
        "summary": "[Connector]['"$wave"'] '"$name"' – mapping+manifest+golden tests+policy",
        "issuetype": {"name": "Story"},
        "labels": ["connectors-'"$wave"'","area:connectors-'"$wave"'"],
        "components": [{"name":"Connectors-'"$wave"'"}],
        "customfield_10014": "'"$epic"'"
      }
    }' | jq -r '.key'
}

for n in "${W1[@]}"; do create_story "$EP_CONN_W1" "$n" "W1"; done
for n in "${W2[@]}"; do create_story "$EP_CONN_W2" "$n" "W2"; done
```

---

## 6) Optional: CSV import (if you prefer UI)

**`jira_import.csv`** (snippet – continue rows similarly)

```csv
Issue Type,Summary,Description,Components,Labels,Fix Version/s
Epic,Governance & Audit Baseline,ABAC/OPA; SSO/SCIM; authority binding,Governance,governance;priority:p0,M1 – G1 Foundations
Epic,Graph Core & ER,Ontology; ER v1+XAI; bi-temporal,Graph-Core,graph-core;priority:p0,M2 – G2 Graph+Prov
Story,[Connector][W1] Wikipedia / Wikidata – mapping+manifest+golden tests+policy,GA-ready connector,Connectors-W1,connectors-W1;priority:p1,M3 – G3 Ingest+24 W1
```

---

## 7) Tie-ins: RACI → CODEOWNERS & branch protections

- **Require 2 approvals** and **code-owner review** on `release/ga-2025` (already set in script).
- Keep CODEOWNERS aligned with your RACI:
  - **Responsible** teams listed on affected paths.
  - **Accountable** (PM/Lead) as mandatory reviewer via GitHub CODEOWNERS or `CODEOWNERS + rulesets`.

---

## 8) Next operational steps

1. Run `scripts/bootstrap_github.sh` (creates branch/protection/labels/milestones/project).
2. Commit the **.github/**, **CODEOWNERS**, templates, and workflows on `release/ga-2025`.
3. Run Jira scripts in order: `jira_seed_epics.sh` → capture epic keys → export as envs (`EP_GOV=IGGA-1` …) → `jira_seed_core_stories.sh` → `jira_seed_connectors.sh`.
4. Create a PR template task list referencing **Gates G1–G6** and link milestones.
5. Enable branch rules for `main` mirroring `release/ga-2025`.

---

## 9) Safety & rollback

- All scripts are **idempotent-ish** but creating projects/issues is permanent; dry-run by echoing cURL commands first.
- Store tokens in a password manager; prefer OIDC for GitHub Actions secrets.

---

## 10) Deliverable checklist

- [ ] `release/ga-2025` exists with protection
- [ ] Labels, milestones, project created
- [ ] CI/CD & security workflows green
- [ ] Jira project `IGGA` with epics & stories (incl. 48 connectors)
- [ ] CODEOWNERS enforced; PR template live
- [ ] M1→M6 milestones mapped to issues
