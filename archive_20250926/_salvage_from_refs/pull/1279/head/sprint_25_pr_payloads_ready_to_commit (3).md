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



---

# Backend Integration Pack — drop‑in code (Express + TypeScript)

> Opinionated starter that wires `/export/simulate` and `/export` to OPA via REST (sidecar). Zero business logic — just decision plumbing, reason/redaction passthrough, and step‑up enforcement hook.

**New files (relative to backend repo root):**
```
src/policy/opaClient.ts
src/routes/export.ts
src/server.ts
src/types.ts
Dockerfile
docker-compose.yml
jest.config.js
package.json (if separate svc) or add scripts to existing
```

## `src/types.ts`
```ts
export type ExportInput = {
  tenant: string;
  user: { id?: string; assurance?: string; clearance?: string; roles?: string[] };
  export: { dataset: string; fields: string[]; reason?: string };
};

export type Decision = {
  allow: boolean;
  reasons?: string[];
  redactions?: string[];
  step_up?: boolean;
};
```

## `src/policy/opaClient.ts`
```ts
import fetch from "node-fetch";
import type { ExportInput, Decision } from "../types";

const OPA_URL = process.env.OPA_URL || "http://localhost:8181";
const DATA_PATH = process.env.OPA_DATA_PATH || "/v1/data/policies/export/decision"; // maps to: package policies.export; decision = {...}

export async function evalExport(input: ExportInput): Promise<Decision> {
  const res = await fetch(`${OPA_URL}${DATA_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OPA error ${res.status}: ${text}`);
  }
  const body = (await res.json()) as { result?: Decision };
  if (!body.result) throw new Error("OPA returned no result");
  return body.result;
}
```

## `src/routes/export.ts`
```ts
import { Router } from "express";
import type { ExportInput } from "../types";
import { evalExport } from "../policy/opaClient";

const MODE = (process.env.EXPORT_POLICY_MODE || "simulate").toLowerCase(); // simulate|enforce

function toInput(obj: any): ExportInput {
  return obj as ExportInput; // trust upstream schema validation
}

const router = Router();

// Accept both GET and POST on /export/simulate for compatibility with plan
router.get("/simulate", async (req, res) => {
  try {
    const input = toInput((req as any).body || (req as any).query || {});
    const decision = await evalExport(input);
    return res.status(200).json({ mode: MODE, ...decision });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/simulate", async (req, res) => {
  try {
    const input = toInput(req.body);
    const decision = await evalExport(input);
    return res.status(200).json({ mode: MODE, ...decision });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const input = toInput(req.body);
    const decision = await evalExport(input);

    if (MODE === "simulate") {
      return res.status(200).json({ mode: MODE, simulated: true, ...decision });
    }

    if (!decision.allow) {
      return res.status(403).json({ mode: MODE, ...decision });
    }

    // TODO: stream the actual export; placeholder payload for Day‑6 demo
    return res.status(200).json({ mode: MODE, ...decision, data: [] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
```

## `src/server.ts`
```ts
import express from "express";
import exportRouter from "./routes/export";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/export", exportRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`[backend] listening on :${port}`));
```

## `Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

## `docker-compose.yml`
```yaml
version: "3.8"
services:
  opa:
    image: openpolicyagent/opa:latest-rootless
    command: ["run", "--server", "--addr", ":8181", "/policies/export.rego"]
    ports: ["8181:8181"]
    volumes:
      - ./policies:/policies:ro
  backend:
    build: .
    environment:
      - PORT=3000
      - OPA_URL=http://opa:8181
      - OPA_DATA_PATH=/v1/data/policies/export/decision
      - EXPORT_POLICY_MODE=simulate
    ports: ["3000:3000"]
    depends_on: [opa]
```

## `jest.config.js` (optional quick test harness)
```js
module.exports = { testEnvironment: "node", roots: ["<rootDir>/test"] };
```

## Minimal tests (`test/export.simulate.test.ts`)
```ts
import request from "supertest";
import express from "express";
import exportRouter from "../src/routes/export";

const app = express();
app.use(express.json());
app.use("/export", exportRouter);

const input = { tenant: "t1", user: { assurance: "webauthn" }, export: { dataset: "public", fields: ["title"] } };

test("simulate returns decision payload", async () => {
  const res = await request(app).post("/export/simulate").send(input);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("allow");
});
```

## cURL smoke tests
```bash
# 1) Start stack
docker compose up --build -d

# 2) Simulate
curl -sS -X POST localhost:3000/export/simulate \
  -H 'content-type: application/json' \
  -d '{"tenant":"t1","user":{"assurance":"webauthn"},"export":{"dataset":"public","fields":["title"]}}' | jq .

# 3) Enforce
export EXPORT_POLICY_MODE=enforce
curl -sS -X POST localhost:3000/export \
  -H 'content-type: application/json' \
  -d '{"tenant":"t1","user":{"assurance":"password"},"export":{"dataset":"restricted","fields":["ssn"]}}' | jq .
```

---

# Adjudication Queue (undo + audit) — lightweight stub

**Goal**: record denies/redactions/step‑ups for human review and undo, with audit trail.

## Table (PostgreSQL)
```sql
create table if not exists export_adjudications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant text not null,
  actor text,
  decision jsonb not null,   -- {allow, reasons, redactions, step_up}
  input jsonb not null,      -- ExportInput snapshot
  status text not null default 'open', -- open|approved|rejected|undone
  notes text
);
```

## API sketch
- `POST /adjudications` — create record from deny/redact/step‑up paths.
- `POST /adjudications/:id/undo` — marks `status='undone'` and triggers re‑export.
- Audit: append-only updates via `export_adjudications_history` or JSONB audit column.

> Wire from `/export` path where `!allow` or `redactions?.length`.

---

# Ops: Feature flags & env

- `EXPORT_POLICY_MODE`: `simulate` (Oct 6–8) → `enforce` thereafter (tenant‑gated).  
- `OPA_URL`: default `http://localhost:8181`.  
- `OPA_DATA_PATH`: `/v1/data/policies/export/decision` (matches `package policies.export`).

---

# Bonus: Makefile helpers (optional)

```makefile
.PHONY: dev test fmt opa

OPA?=opa

dev:
	npm run dev

test:
	npm test -- --runInBand

fmt:
	$(OPA) fmt -w policies

opa-test:
	$(OPA) test policies -v
```



---

# SRE Observability Pack — Prometheus rules, SLO burn alerts, CI

> Extends **PR 2 — SRE/Observability**. Drop these into the infra repo to make the Grafana dashboard light up with real SLIs and wire Day‑6 demo alerts.

**New files (under `ops/observability` or similar):**
```
prometheus/rules/intelgraph-ga-core.yml
prometheus/alerts/intelgraph-ga-core-alerts.yml
.github/workflows/prom-rules-validate.yml
Makefile (promtool helpers)
```

## Assumed metrics (align exporters/instrumentation)
- `app_nlq_latency_seconds_bucket{env,tenant,phase="preview"}` — histogram
- `app_exec_latency_seconds_bucket{env,tenant,phase="exec"}` — histogram
- `app_export_decisions_total{env,tenant,outcome="allow|deny|redacted"}` — counter
- `er_evaluations_total{env,tenant,outcome="tp|fp|tn|fn"}` — counter

> **SLO targets**: preview p95 ≤ **1.5s**, exec p95 ≤ **3.5s**, availability-like target **99%** by threshold‑based SLI.

## `prometheus/rules/intelgraph-ga-core.yml`
```yaml
groups:
  - name: intelgraph.sli
    interval: 30s
    rules:
      # p95 Latencies (5m window) — per env, aggregated across tenants by default
      - record: slis:nlq_preview_latency:p95
        expr: |
          histogram_quantile(0.95,
            sum by (le, env) (rate(app_nlq_latency_seconds_bucket{phase="preview"}[5m]))
          )
      - record: slis:exec_latency:p95
        expr: |
          histogram_quantile(0.95,
            sum by (le, env) (rate(app_exec_latency_seconds_bucket{phase="exec"}[5m]))
          )

      # Error ratio for threshold SLOs (latency > T is an error)
      - record: slis:nlq_preview_error_ratio
        expr: |
          1 - (
            sum by (env) (rate(app_nlq_latency_seconds_bucket{phase="preview", le="1.5"}[5m]))
            /
            sum by (env) (rate(app_nlq_latency_seconds_bucket{phase="preview", le="+Inf"}[5m]))
          )
      - record: slis:exec_error_ratio
        expr: |
          1 - (
            sum by (env) (rate(app_exec_latency_seconds_bucket{phase="exec", le="3.5"}[5m]))
            /
            sum by (env) (rate(app_exec_latency_seconds_bucket{phase="exec", le="+Inf"}[5m]))
          )

      # Export decision rates
      - record: slis:export:allow_rps
        expr: sum by (env) (rate(app_export_decisions_total{outcome="allow"}[5m]))
      - record: slis:export:deny_rps
        expr: sum by (env) (rate(app_export_decisions_total{outcome="deny"}[5m]))
      - record: slis:export:redacted_rps
        expr: sum by (env) (rate(app_export_decisions_total{outcome="redacted"}[5m]))

      # ER precision/recall (guardrails: show on dashboard; alert only on extremes)
      - record: slis:er:precision
        expr: |
          (sum by (env) (rate(er_evaluations_total{outcome="tp"}[15m])))
          /
          (sum by (env) (rate(er_evaluations_total{outcome=~"tp|fp"}[15m])))
      - record: slis:er:recall
        expr: |
          (sum by (env) (rate(er_evaluations_total{outcome="tp"}[15m])))
          /
          (sum by (env) (rate(er_evaluations_total{outcome=~"tp|fn"}[15m])))
```

## `prometheus/alerts/intelgraph-ga-core-alerts.yml`
```yaml
groups:
  - name: intelgraph.slo.burn
    interval: 30s
    rules:
      # Multi-window, multi-burn SLO alerts (target=99%)
      - alert: NLQPreviewLatencySLOBurn
        annotations:
          summary: "Preview latency SLO burning (env={{ $labels.env }})"
          runbook: "slo/nlq_preview_latency.md"
        expr: |
          # Short window ~5m @ 14.4x + long window ~1h @ 6x
          (
            slis:nlq_preview_error_ratio > (0.01 * 14.4)
          )
          or
          (
            avg_over_time(slis:nlq_preview_error_ratio[1h]) > (0.01 * 6)
          )
        for: 5m
        labels:
          severity: page

      - alert: ExecLatencySLOBurn
        annotations:
          summary: "Exec latency SLO burning (env={{ $labels.env }})"
          runbook: "slo/exec_latency.md"
        expr: |
          (
            slis:exec_error_ratio > (0.01 * 14.4)
          ) or (
            avg_over_time(slis:exec_error_ratio[1h]) > (0.01 * 6)
          )
        for: 5m
        labels:
          severity: page

  - name: intelgraph.quality
    interval: 1m
    rules:
      - alert: ERPrecisionLow
        annotations:
          summary: "ER precision drift (env={{ $labels.env }})"
        expr: slis:er:precision < 0.92
        for: 15m
        labels:
          severity: ticket

      - alert: ERRecallLow
        annotations:
          summary: "ER recall drift (env={{ $labels.env }})"
        expr: slis:er:recall < 0.90
        for: 15m
        labels:
          severity: ticket
```

## `.github/workflows/prom-rules-validate.yml`
```yaml
name: Prometheus Rules Validate
on:
  pull_request:
    paths:
      - 'prometheus/**'
      - '.github/workflows/prom-rules-validate.yml'
jobs:
  promtool:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install promtool
        run: |
          VER=$(curl -s https://api.github.com/repos/prometheus/prometheus/releases/latest | jq -r .tag_name | sed 's/^v//')
          curl -L -o /tmp/prom.tar.gz https://github.com/prometheus/prometheus/releases/download/v${VER}/prometheus-${VER}.linux-amd64.tar.gz
          tar -C /tmp -xzf /tmp/prom.tar.gz
          sudo mv /tmp/prometheus-${VER}.linux-amd64/promtool /usr/local/bin/promtool
      - name: Check rules
        run: |
          promtool check rules prometheus/rules/*.yml
          promtool check rules prometheus/alerts/*.yml
```

## Makefile helpers (observability repo)
```makefile
prom-check:
	promtool check rules prometheus/rules/*.yml
	promtool check rules prometheus/alerts/*.yml
```

---

# API Contract — OpenAPI 3.1 + Mock server

> Optional **PR 4** (or include in PR 1). Provides a formal schema for `/export` and `/export/simulate` and enables a zero-code mock using Prism.

**File:** `openapi/export.yaml`
```yaml
openapi: 3.1.0
info:
  title: IntelGraph Export Guardrails API
  version: 1.0.0
servers:
  - url: /
paths:
  /export/simulate:
    post:
      summary: Evaluate export decision without emitting data
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportInput'
            examples:
              preview:
                value:
                  tenant: t1
                  user: { assurance: webauthn }
                  export: { dataset: public, fields: [title] }
      responses:
        '200':
          description: Decision payload
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DecisionResponse' }
        '500': { $ref: '#/components/responses/Error' }
  /export:
    post:
      summary: Execute export with enforcement
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportInput'
      responses:
        '200':
          description: Allowed; export stream/payload begins
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DecisionResponse' }
        '403':
          description: Blocked by policy
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DecisionResponse' }
        '500': { $ref: '#/components/responses/Error' }
components:
  schemas:
    ExportInput:
      type: object
      required: [tenant, user, export]
      properties:
        tenant: { type: string }
        user:
          type: object
          properties:
            id: { type: string }
            assurance: { type: string, enum: [password, webauthn, otp, mfa] }
            clearance: { type: string }
            roles: { type: array, items: { type: string } }
        export:
          type: object
          required: [dataset, fields]
          properties:
            dataset: { type: string }
            fields: { type: array, items: { type: string } }
            reason: { type: string }
    Decision:
      type: object
      required: [allow]
      properties:
        allow: { type: boolean }
        reasons: { type: array, items: { type: string } }
        redactions: { type: array, items: { type: string } }
        step_up: { type: boolean }
    DecisionResponse:
      allOf:
        - $ref: '#/components/schemas/Decision'
        - type: object
          properties:
            mode: { type: string, enum: [simulate, enforce] }
            simulated: { type: boolean }
            decision_id: { type: string, format: uuid }
            data: { description: Export payload (shape defined by dataset), nullable: true }
  responses:
    Error:
      description: Error
      content:
        application/json:
          schema:
            type: object
            properties:
              error: { type: string }
```

**Mock locally (Prism):**
```bash
npm i -g @stoplight/prism-cli
prism mock openapi/export.yaml --port 4010
curl -s localhost:4010/export/simulate -X POST \
  -H 'content-type: application/json' \
  -d '{"tenant":"t1","user":{"assurance":"webauthn"},"export":{"dataset":"public","fields":["title"]}}' | jq .
```

---

# Dashboard wiring notes (to match rules)
- Update panels to read from `slis:*` recording rules where possible (cheaper + consistent).
- Add two singlestats: **Preview p95 (s)** and **Exec p95 (s)** using the `slis:*:p95` series, with thresholds 1.5 and 3.5.
- Add three time series for export decisions using `slis:export:*_rps`.
- Add ER precision/recall stat panels targeting 0.92/0.90 warning lines.

---

# Day‑6 demo checklist (observability)
- [ ] p95 board shows preview ≤1.5s, exec ≤3.5s on `env=stage`.
- [ ] Trigger synthetic load to cross thresholds and show **SLO burn** alerts firing.
- [ ] ER precision/recall panels rendering; alerts remain green.



---

# Infra as Code — Helm, Helmfile, Terraform, K8s (datasource UID automated)

> Drop these into your infra repo. This wires Prometheus + Grafana with the **Prometheus UID set to `prometheus-main`**, provisions the **IntelGraph** dashboard folder, and imports the GA Core dashboard automatically.

**New files**
```
deploy/helm/helmfile.yaml
deploy/helm/values/prometheus-stage.yaml
deploy/helm/values/grafana-stage.yaml
deploy/k8s/backend-with-opa.yaml
terraform/grafana/main.tf
terraform/grafana/variables.tf
terraform/grafana/outputs.tf
.github/workflows/iac-validate.yml
```

## `deploy/helm/helmfile.yaml`
```yaml
repositories:
  - name: grafana
    url: https://grafana.github.io/helm-charts
  - name: prometheus-community
    url: https://prometheus-community.github.io/helm-charts

releases:
  - name: prom
    namespace: observability
    chart: prometheus-community/prometheus
    version: "^25.0.0"
    values:
      - values/prometheus-stage.yaml

  - name: grafana
    namespace: observability
    chart: grafana/grafana
    version: "^8.0.0"
    values:
      - values/grafana-stage.yaml
```

## `deploy/helm/values/prometheus-stage.yaml`
```yaml
serverFiles:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
          - role: node
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
  rules:
    groups: []
  # Inline GA Core recording & alerting rules
  alerts: |
    {{- /* keep empty if using separate files */ -}}

extraServerFiles:
  rules/intelgraph-ga-core.yml: |
{{ .Files.Get "prometheus/rules/intelgraph-ga-core.yml" | indent 4 }}
  alerts/intelgraph-ga-core-alerts.yml: |
{{ .Files.Get "prometheus/alerts/intelgraph-ga-core-alerts.yml" | indent 4 }}

server:
  retention: 15d
```

> If your CI renders with pure `helm` (not a parent chart), replace the `{{ .Files.Get ... }}` inclusions by pasting the YAML directly or mount as ConfigMaps.

## `deploy/helm/values/grafana-stage.yaml`
```yaml
adminUser: admin
adminPassword: admin
service:
  type: ClusterIP
persistence:
  enabled: true
  size: 5Gi

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        uid: prometheus-main
        type: prometheus
        access: proxy
        isDefault: true
        url: http://prom-server.observability.svc:80
        jsonData:
          httpMethod: POST

dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: ga-core
        orgId: 1
        folder: IntelGraph
        type: file
        disableDeletion: true
        updateIntervalSeconds: 30
        options:
          path: /var/lib/grafana/dashboards/ga-core

# Use built-in dashboards loader
dashboards:
  ga-core:
    ga_core.json:
      json: |
{{ .Files.Get "grafana/dashboards/ga_core.json" | indent 8 }}
```

> The **datasource UID is fixed to `prometheus-main`**; the dashboard references should use that UID. If your dashboard JSON contains another UID, run a one-time `jq` patch or regenerate with the desired UID.

---

# K8s — Backend with OPA sidecar (simulate → enforce)

**File:** `deploy/k8s/backend-with-opa.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: core
spec:
  replicas: 2
  selector:
    matchLabels: { app: backend }
  template:
    metadata:
      labels: { app: backend }
    spec:
      containers:
        - name: app
          image: ghcr.io/yourorg/backend:sha-abcdef
          env:
            - { name: PORT, value: "3000" }
            - { name: OPA_URL, value: "http://localhost:8181" }
            - { name: OPA_DATA_PATH, value: "/v1/data/policies/export/decision" }
            - { name: EXPORT_POLICY_MODE, value: "simulate" } # flip to enforce Oct 8
          ports: [{ containerPort: 3000 }]
        - name: opa
          image: openpolicyagent/opa:latest-rootless
          args: ["run", "--server", "--addr", ":8181", "/policies/export.rego"]
          ports: [{ containerPort: 8181 }]
          volumeMounts:
            - name: export-policy
              mountPath: /policies
              readOnly: true
      volumes:
        - name: export-policy
          configMap:
            name: export-policy
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: core
spec:
  selector: { app: backend }
  ports:
    - port: 80
      targetPort: 3000
      name: http
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: export-policy
  namespace: core
  labels: { app: backend }
data:
  export.rego: |
    # paste contents from policies/export.rego artifact here
```

> Use a `kubectl patch` or Kustomize overlay on **Oct 8** to set `EXPORT_POLICY_MODE=enforce`.

---

# Terraform — Grafana datasource + folder + dashboard

**File:** `terraform/grafana/main.tf`
```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = ">= 2.7.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url        # e.g., https://grafana.stage.yourorg.com
  auth = var.grafana_auth_token # service account token
}

resource "grafana_folder" "intelgraph" {
  title = "IntelGraph"
}

resource "grafana_datasource" "prom" {
  type = "prometheus"
  name = "Prometheus"
  uid  = "prometheus-main"
  url  = var.prometheus_url     # e.g., http://prom-server.observability.svc
  is_default = true
}

resource "grafana_dashboard" "ga_core" {
  folder      = grafana_folder.intelgraph.id
  config_json = file("${path.module}/ga_core.dashboard.json")
}
```

**File:** `terraform/grafana/variables.tf`
```hcl
variable "grafana_url" { type = string }
variable "grafana_auth_token" { type = string, sensitive = true }
variable "prometheus_url" { type = string }
```

**File:** `terraform/grafana/outputs.tf`
```hcl
output "dashboard_url" {
  value = grafana_dashboard.ga_core.url
}
```

> Copy the artifact dashboard JSON to `terraform/grafana/ga_core.dashboard.json` before `terraform apply`.

---

# CI — IaC validation

**File:** `.github/workflows/iac-validate.yml`
```yaml
name: IaC Validate (Helm/Terraform)
on:
  pull_request:
    paths:
      - 'deploy/**'
      - 'terraform/**'
      - '.github/workflows/iac-validate.yml'
jobs:
  helm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-helm@v4
      - name: Lint Grafana values
        run: |
          helm repo add grafana https://grafana.github.io/helm-charts
          helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
          helm repo update
          helm template test grafana/grafana -f deploy/helm/values/grafana-stage.yaml >/dev/null
          helm template test prometheus-community/prometheus -f deploy/helm/values/prometheus-stage.yaml >/dev/null
  tf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Terraform validate
        working-directory: terraform/grafana
        run: |
          terraform init -backend=false
          terraform validate
```

---

# One-time patch — force dashboard to use `prometheus-main` UID

**Script:** `scripts/patch-dashboard-uid.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
FILE=${1:-grafana/dashboards/ga_core.json}
OLD=${2:-""}
NEW=prometheus-main
if [[ -n "$OLD" ]]; then
  jq --arg old "$OLD" --arg new "$NEW" '(.panels[]?.datasource.uid? // .__inputs[]?.name? // empty) as $ds | . | walk(if type==object and has("datasource") then (.datasource.uid = $new) else . end)' "$FILE" | sponge "$FILE"
else
  # naive: set any uid fields to NEW
  jq --arg new "$NEW" 'walk(if type==object and has("uid") and .uid|type=="string" then (.uid=$new) else . end)' "$FILE" | sponge "$FILE"
fi
```

**Usage**
```bash
brew install jq moreutils || true
bash scripts/patch-dashboard-uid.sh grafana/dashboards/ga_core.json
```

---

# Runbooks (short)
- **SLO burn fires**: check recent deploys, raise capacity, examine p95 regressions per endpoint; toggle `EXPORT_POLICY_MODE=simulate` for affected tenants if tied to guardrails.
- **Datasource missing**: confirm Helm/Terraform applied; verify UID `prometheus-main` exists; re-run patch script on dashboard JSON if needed.

