# PR 1 — DevSec/BE: OPA policy + CI + simulate stage

**Title**: Export guardrails (OPA) — Sprint 25  
**Branch**: `feat/opa-export-guardrails-sprint25`  
**Repo**: `app/backend` (monorepo path) or backend repo

---

## PR description (paste into PR body)

**What**  
Adds `policies/export.rego` (export allow/deny/redaction + WebAuthn step‑up), unit tests, and OPA CI. Enables a default **simulate** stage for the first 48 hours of the sprint so teams get decision payloads without blocking exports.

**Why**  
Sprint 25 objective: **GA Core Hardening & Guardrails**. We need deterministic export decisions, transparent reasons, DLP masking on PII, and step‑up for Sensitive/Restricted prior to enforcement.

**Scope**  
- `policies/export.rego` (drop-in from artifact)
- `policies/tests/export_test.rego` (minimal happy/sad-path unit tests)
- `.github/workflows/policy-ci.yml` (fmt/check/test)
- Feature flag: `EXPORT_POLICY_MODE=simulate` (48h default)

**Endpoints to wire**  
- `GET /export/simulate` → returns `{allow, reasons, redactions, step_up}` from OPA (no data emitted)
- `POST /export` → returns same payload + stream; blocks when `allow=false`

**Rollout plan**  
- Oct 6–8 (America/Denver): simulate mode; watch decision logs and Grafana export panels.  
- Oct 8+: flip to `enforce` for tenants meeting calibration thresholds; maintain step‑up for Sensitive/Restricted.

**Tests**  
- `opa test policies -v` must be green in CI.  
- Add BE integration once endpoints are hooked.

**Observability**  
- Dashboard panels (export allow/deny/redacted) should move in tandem with policy decisions.

**Risk & mitigations**  
- False denies: simulate window + adjudication queue.  
- Calibration drift: ER model fallback to GBDT per defaults.

---

## Files added/changed

`policies/tests/export_test.rego`
```rego
package policies.export_test

import future.keywords.if

# Happy path: public dataset
_test_allow_on_public if {
  input := {
    "tenant": "t1",
    "user": {"assurance": "webauthn", "clearance": "baseline"},
    "export": {"dataset": "public", "fields": ["title"]}
  }
  result := data.policies.export.decision with input as input
  result.allow == true
  not result.step_up
}

# Sad path: restricted without step-up
_test_deny_on_restricted_without_stepup if {
  input := {
    "tenant": "t1",
    "user": {"assurance": "password", "clearance": "baseline"},
    "export": {"dataset": "restricted", "fields": ["ssn"]}
  }
  result := data.policies.export.decision with input as input
  result.allow == false
  result.reasons[_] == "step_up_required"
}

# Redactions applied for PII
_test_redactions_applied if {
  input := {
    "tenant": "t1",
    "user": {"assurance": "webauthn"},
    "export": {"dataset": "mixed", "fields": ["email", "name", "ssn"]}
  }
  result := data.policies.export.decision with input as input
  result.redactions[_] == "pii:ssn"
}
```

`.github/workflows/policy-ci.yml`
```yaml
name: OPA Policy CI
on:
  pull_request:
    paths: ["policies/**", ".github/workflows/policy-ci.yml"]
jobs:
  opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install opa
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
          sudo mv opa /usr/local/bin/
      - name: Check format
        run: opa fmt -d policies --list
      - name: Static check
        run: opa check policies
      - name: Unit tests
        run: opa test policies -v
```

> **Note:** Copy the artifact into `policies/export.rego` from `sprint25_day1_artifacts.zip` or the standalone `export.rego` you have locally.

---

## Ready-to-run commands

```bash
# from backend repo root
git checkout -b feat/opa-export-guardrails-sprint25
mkdir -p policies/tests .github/workflows
# copy your export.rego → policies/export.rego
cp /path/to/export.rego policies/export.rego
# add test & CI files from this PR payload
$EDITOR policies/tests/export_test.rego
$EDITOR .github/workflows/policy-ci.yml

git add policies .github/workflows/policy-ci.yml
git commit -m "OPA export policy + CI (simulate stage default for Sprint 25)"
git push -u origin feat/opa-export-guardrails-sprint25

gh pr create \
  -t "Export guardrails (OPA) — Sprint 25" \
  -b "Adds export.rego, unit tests, and OPA CI. Enable simulate for 48h per sprint plan. Wires /export/simulate and /export endpoints (follow-up commit)."
```

---

# PR 2 — SRE/Observability: Grafana-as-code

**Title**: Grafana GA Core dashboard — Sprint 25  
**Branch**: `feat/grafana-ga-core-dashboard-sprint25`  
**Repo**: `ops/observability` (or infra repo)

---

## PR description (paste into PR body)

**What**  
Adds IntelGraph GA Core dashboard as code with provisioning and CI validation.

**Why**  
To track NLQ p95, ingest p95, export allow/deny/redacted, ER precision/recall, and SLO burn during the guardrails rollout.

**Scope**  
- `grafana/dashboards/ga_core.json` (drop-in from artifact)
- `grafana/provisioning/dashboards/ga-core.yaml` (file provider)
- `.github/workflows/grafana-validate.yml` (JSON sanity via `jq`)

**Post-merge action**  
Set Prometheus datasource by UID; verify variables `env`, `tenant` render on `stage`.

---

## Files added/changed

`grafana/provisioning/dashboards/ga-core.yaml`
```yaml
apiVersion: 1
providers:
  - name: ga-core
    orgId: 1
    folder: IntelGraph
    type: file
    disableDeletion: true
    updateIntervalSeconds: 30
    options:
      path: grafana/dashboards
```

`.github/workflows/grafana-validate.yml`
```yaml
name: Grafana Dashboard Validate
on:
  pull_request:
    paths: ["grafana/**", ".github/workflows/grafana-validate.yml"]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate JSON
        run: jq . grafana/dashboards/ga_core.json >/dev/null
```

> **Note:** Copy the artifact JSON into `grafana/dashboards/ga_core.json` from `sprint25_day1_artifacts.zip` or the standalone `grafana_ga_core_dashboard.json` you have locally.

---

## Ready-to-run commands

```bash
# from observability repo root
git checkout -b feat/grafana-ga-core-dashboard-sprint25
mkdir -p grafana/dashboards grafana/provisioning/dashboards .github/workflows
cp /path/to/grafana_ga_core_dashboard.json grafana/dashboards/ga_core.json
$EDITOR grafana/provisioning/dashboards/ga-core.yaml
$EDITOR .github/workflows/grafana-validate.yml

git add grafana .github/workflows/grafana-validate.yml
git commit -m "Grafana GA Core dashboard + provisioning (Sprint 25)"
git push -u origin feat/grafana-ga-core-dashboard-sprint25

gh pr create \
  -t "Grafana GA Core dashboard — Sprint 25" \
  -b "Imports GA Core dashboard and provisioning. Datasource UID must be set post-merge."
```

---

# PR 3 — PM: Jira CSV under `/project/pm/`

**Title**: PM: Sprint 25 Jira CSV  
**Branch**: `chore/pm-sprint25-jira-import`  
**Repo**: monorepo path `project/pm/` (or docs/pm repo)

---

## PR description (paste into PR body)

**What**  
Adds Sprint 25 backlog CSV and a one‑pager for import steps. Includes a CI check for required headers.

**Why**  
Single source of truth for PM import; operationalizes the kickoff instructions in Handoff.

**Scope**  
- `project/pm/sprints/2025-10-06_sprint25/sprint25_jira.csv`
- `project/pm/sprints/2025-10-06_sprint25/README.md`
- `.github/workflows/validate-pm-csv.yml`

**Operator steps**  
Jira → System → External System Import → CSV → map Parent/Epic/External ID → set Sprint="Sprint 25" (Board: IntelGraph Core).

---

## Files added/changed

`project/pm/sprints/2025-10-06_sprint25/README.md`
```md
# Sprint 25 (Oct 6–17, 2025) — Jira Import

Jira → System → External System Import → CSV → map Parent/Epic/External ID; set Sprint="Sprint 25" (Board: IntelGraph Core).
```

`.github/workflows/validate-pm-csv.yml`
```yaml
name: PM CSV Validate
on:
  pull_request:
    paths: ["project/pm/**", ".github/workflows/validate-pm-csv.yml"]
jobs:
  csv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate headers
        run: |
          head -n1 project/pm/sprints/2025-10-06_sprint25/sprint25_jira.csv | tr ',' '\n' | sed 's/\"//g' > headers.txt
          required=("Summary" "Issue Type" "Parent" "Epic" "External ID" "Sprint")
          for r in "${required[@]}"; do grep -qx "$r" headers.txt || { echo "Missing header: $r"; exit 1; }; done
```

> **Note:** Copy the artifact CSV into `project/pm/sprints/2025-10-06_sprint25/sprint25_jira.csv` from `sprint25_day1_artifacts.zip` or your standalone `sprint25_jira.csv`.

---

## Ready-to-run commands

```bash
# from monorepo root (or docs/pm repo)
git checkout -b chore/pm-sprint25-jira-import
mkdir -p project/pm/sprints/2025-10-06_sprint25 .github/workflows
cp /path/to/sprint25_jira.csv project/pm/sprints/2025-10-06_sprint25/sprint25_jira.csv
$EDITOR project/pm/sprints/2025-10-06_sprint25/README.md
$EDITOR .github/workflows/validate-pm-csv.yml

git add project/pm .github/workflows/validate-pm-csv.yml
git commit -m "Sprint 25 Jira CSV + import guide"
git push -u origin chore/pm-sprint25-jira-import

gh pr create \
  -t "PM: Sprint 25 Jira CSV" \
  -b "Adds Sprint 25 backlog CSV and import README."
```

---

# Optional: Day‑6 bundle verification script (drop in /scripts)

`scripts/verify-bundle.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
ZIP=${1:-sprint25_day1_artifacts.zip}
shasum -a 256 "$ZIP"
unzip -l "$ZIP"
unzip -p "$ZIP" grafana_ga_core_dashboard.json | jq . >/dev/null
unzip -p "$ZIP" export.rego | head -n 20
unzip -p "$ZIP" sprint25_jira.csv | head -n 5
```

**Usage**
```bash
bash scripts/verify-bundle.sh /path/to/sprint25_day1_artifacts.zip
```

---

# Owners & kick-off checklist (for PR bodies)
- [ ] PM: CSV import complete; issues assigned to Sprint 25.
- [ ] DevSec/BE: `/export/simulate` + `/export` endpoints returning OPA decision payloads.
- [ ] SRE: Datasource UID set; dashboard renders for `env=stage` and a test `tenant`.
- [ ] All: Defaults live — step-up for Sensitive/Restricted; DLP masks `pii:*` + explicit fields; ER model = logistic regression (fallback GBDT if calibration drifts).

