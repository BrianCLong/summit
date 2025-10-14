```md
# Maestro Conductor (MC) — Sprint Artifacts *(v1.0.0)*

**Slug:** `mc-sprint-2025-09-29-artifacts-v1`  
**Date:** 2025-09-29  
**Scope:** Concrete, copy‑pasteable artifacts referenced by the sprint plan.

> Canonical source of truth for scaffolds, specs, policies, CI, SLOs, runbooks, and release mechanics. All examples are minimal but production‑grade. Replace `${ORG}` and `${ENV}` where appropriate.

---

## 1) ADRs (initial drafts)

### 1.1 `docs/adr/ADR-0001-manifest-schema.md`
```md
# ADR-0001: MC Workflow Manifest v1 (JSON Schema)
Date: 2025-09-29
Status: Proposed
Owners: Platform, Orchestrator

## Context
We need a stable, versioned workflow manifest to enable deterministic validation, provenance, and policy evaluation. Consumers include Composer, CLI, MC API, and OPA.

## Decision
Adopt a JSON Schema (2020-12) published in-repo and served via MC `/schemas/manifest.v1.json`. Enforce semver on `version`. All submissions are validated server-side; invalid inputs are rejected with a structured error list.

## Consequences
+ Contract tests prevent drift.  
+ Tooling (CLI) can `plan` locally.  
- Schema evolution requires migration docs and compatibility matrix.

## Alternatives
- Protobuf schema (rejected for readability).  
- OpenAPI-only (insufficient for DAG semantics).
```

### 1.2 `docs/adr/ADR-0002-receipt-signing.md`
```md
# ADR-0002: Execution Receipt Signing & Verification
Date: 2025-09-29
Status: Proposed
Owners: Security, Orchestrator

## Context
Every execution must produce a tamper-evident receipt with digests, policy decisions, and environment metadata for audit and disclosure.

## Decision
Sign receipts with Sigstore (cosign) using keyless in CI and key-backed in prod. Store receipts and signatures in an append-only store (S3 + object lock) and index by content digest. Provide `/api/executions/{id}/receipt` and `/verify` endpoints.

## Consequences
+ Verifiable provenance for audits and customers.  
+ CI can block on verification.  
- Additional latency (<250ms) and key management procedures.

## Alternatives
- GPG (heavier operational burden).  
- No signing (non-compliant).
```

---

## 2) Workflow Manifest v1 — Full JSON Schema
`apps/mc-api/schemas/manifest.v1.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://companyos/internal/maestro/manifest.v1.json",
  "title": "MC Workflow Manifest v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["name", "version", "tasks"],
  "properties": {
    "name": {"type": "string", "pattern": "^[a-zA-Z0-9-_]{3,64}$"},
    "description": {"type": "string", "maxLength": 2048},
    "version": {"type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$"},
    "region": {"type": "string"},
    "labels": {"type": "object", "additionalProperties": {"type": "string"}},
    "inputs": {"type": "object", "additionalProperties": true},
    "tasks": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "uses"],
        "properties": {
          "id": {"type": "string", "pattern": "^[a-zA-Z0-9-_]{1,64}$"},
          "uses": {"type": "string", "pattern": "^pkg:[a-z0-9-]+/.+@.+$"},
          "with": {"type": "object", "additionalProperties": true},
          "needs": {"type": "array", "items": {"type": "string"}},
          "retries": {"type": "integer", "minimum": 0, "maximum": 10},
          "timeoutSeconds": {"type": "integer", "minimum": 1, "maximum": 86400},
          "resources": {
            "type": "object",
            "properties": {
              "class": {"type": "string", "enum": ["small", "medium", "large"]}
            },
            "additionalProperties": false
          }
        }
      }
    }
  }
}
```

---

## 3) OpenAPI (MC Control Plane) — Minimal but runnable
`apps/mc-api/openapi.yaml`
```yaml
openapi: 3.0.3
info:
  title: Maestro Conductor API
  version: 0.1.0
servers:
  - url: https://api.${ORG}.com/${ENV}
paths:
  /api/workflows:
    post:
      summary: Create or update a workflow draft
      operationId: createWorkflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Workflow'
      responses:
        '201': { description: Created }
        '400': { description: Validation error }
  /api/workflows/{id}/publish:
    post:
      summary: Publish an immutable snapshot
      operationId: publishWorkflow
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200': { description: Published }
        '409': { description: Version conflict }
  /api/workflows/{id}/dry-run:
    post:
      summary: Evaluate policy and plan without side effects
      operationId: dryRun
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Plan & policy decisions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlanResult'
  /api/executions:
    post:
      summary: Start an execution
      operationId: startExecution
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StartRequest'
      responses:
        '202': { description: Accepted }
  /api/executions/{id}/receipt:
    get:
      summary: Fetch the signed receipt
      operationId: getReceipt
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Receipt JSON
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Receipt'
components:
  schemas:
    Workflow:
      type: object
      externalDocs:
        url: /schemas/manifest.v1.json
    PlanResult:
      type: object
      properties:
        decisions: { type: array, items: { type: object } }
        estimatedCostUSD: { type: number }
    StartRequest:
      type: object
      properties:
        workflowId: { type: string }
        inputs: { type: object }
        rollout: { type: string, enum: ["canary","all"] }
      required: [workflowId]
    Receipt:
      type: object
      properties:
        executionId: { type: string }
        startedAt: { type: string, format: date-time }
        finishedAt: { type: string, format: date-time }
        steps: { type: array, items: { type: object } }
        digests: { type: object }
        policyDecisions: { type: array, items: { type: object } }
        signature: { type: string }
```

---

## 4) OPA Policy Packs (rego + tests)

### 4.1 Residency
`policy/rego/residency.rego`
```rego
package mc.residency

default allow = false

allow {
  input.workflow.region == input.request.region
  not banned[input.request.region]
}

banned["RU"]
baned["KP"] # intentional typo for test catch
```

`policy/tests/residency_test.rego`
```rego
package mc.residency

import data.mc.residency

# happy path
test_allow_same_region {
  allow with input as {
    "workflow": {"region": "US"},
    "request": {"region": "US"}
  }
}

# banned
test_deny_banned {
  not allow with input as {
    "workflow": {"region": "US"},
    "request": {"region": "RU"}
  }
}
```

### 4.2 PII
`policy/rego/pii.rego`
```rego
package mc.pii

violation[msg] {
  some k
  input.manifest.tasks[i].with[k]
  startswith(lower(k), "ssn")
  msg := sprintf("PII key disallowed: %s", [k])
}
```

### 4.3 Budget
`policy/rego/budget.rego`
```rego
package mc.budget

default allow = true

deny[msg] {
  input.estimatedCostUSD > input.budget.maxCostUSD
  msg := sprintf("Estimated cost %.2f exceeds max %.2f", [input.estimatedCostUSD, input.budget.maxCostUSD])
}
```

### 4.4 Runner Quotas
`policy/rego/quotas.rego`
```rego
package mc.quotas

default allow = false

allow {
  input.request.resourceClass == "small"
  input.actor.remainingSmall > 0
}

allow {
  input.request.resourceClass == "medium"
  input.actor.remainingMedium > 0
}

allow {
  input.request.resourceClass == "large"
  input.actor.remainingLarge > 0
}
```

---

## 5) GitHub Actions (CI + Release)

### 5.1 `/.github/workflows/mc-ci.yml`
```yaml
name: mc-ci
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'policy/**'
      - 'infra/**'
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test --workspaces
      - name: Lint rego
        run: |
          curl -sSfL https://raw.githubusercontent.com/open-policy-agent/conftest/master/install.sh | sh -s -- -b ./bin
          ./bin/conftest test policy/ -p policy/rego
      - name: SBOM (syft)
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b ./bin
          ./bin/syft dir:. -o cyclonedx-json > sbom.json
      - name: Unit coverage gate
        run: |
          node scripts/coverage-gate.js 85
```

### 5.2 `/.github/workflows/mc-release.yml`
```yaml
name: mc-release
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Semver version'
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build --workspaces
      - name: Package artifacts
        run: tar -czf dist/mc-api.tgz apps/mc-api
      - name: Cosign attest SBOM
        env: { COSIGN_EXPERIMENTAL: '1' }
        run: |
          curl -sSfL https://raw.githubusercontent.com/sigstore/cosign/main/install.sh | sh -s -- -b ./bin
          ./bin/cosign attest --predicate sbom.json --type cyclonedx dist/mc-api.tgz || true
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ inputs.version }}
          files: |
            dist/mc-api.tgz
            sbom.json
            docs/release/notes-${{ inputs.version }}.md
```

---

## 6) Helm Chart (canary & budgets)

`infra/helm/mc/Chart.yaml`
```yaml
apiVersion: v2
name: mc
version: 0.1.0
appVersion: 0.1.0
```

`infra/helm/mc/values.yaml`
```yaml
replicaCount: 6
image:
  repository: ghcr.io/${ORG}/mc-api
  tag: latest
canary:
  enabled: true
  weight: 10
  thresholds:
    errorRate: 0.01
    p95LatencyMs: 900
budgets:
  errorBudgetMinutes: 30
  maxCostPerRunUSD: 1.50
```

`infra/helm/mc/templates/deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mc-api
spec:
  replicas: {{ .Values.replicaCount }}
  selector: { matchLabels: { app: mc-api } }
  template:
    metadata:
      labels: { app: mc-api }
      annotations:
        rollouts.argoproj.io/steps: |
          - setWeight: {{ .Values.canary.weight }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 8080
          env:
            - name: ERROR_BUDGET_MINUTES
              value: "{{ .Values.budgets.errorBudgetMinutes }}"
```

---

## 7) Terraform Module Skeleton
`infra/terraform/mc/main.tf`
```hcl
terraform {
  required_version = ">= 1.6.0"
}

provider "aws" {
  region = var.region
}

module "mc_api" {
  source = "./modules/mc_api"
  name   = var.name
  tags   = var.tags
}
```

`infra/terraform/mc/variables.tf`
```hcl
variable "name" { type = string }
variable "region" { type = string }
variable "tags" { type = map(string) }
```

---

## 8) CLI Spec & Scaffolds

`apps/mc-cli/spec.md`
```md
# maestro CLI Spec

## Commands
- `maestro init` — writes template manifest, config, CI.
- `maestro plan -m <manifest>` — validates against schema, runs local OPA.
- `maestro run -w <id> [--canary]` — starts execution.
- `maestro status -e <execId>` — tails and prints receipt summary.
```

`apps/mc-cli/templates/workflow.yaml`
```yaml
name: sample-workflow
version: 0.1.0
region: US
tasks:
  - id: fetch
    uses: pkg:http/get@1.0.0
    with: { url: https://example.com }
```

---

## 9) Receipt Format & Verifier

`docs/provenance/receipt.sample.json`
```json
{
  "executionId": "exec_123",
  "startedAt": "2025-09-29T17:23:11Z",
  "finishedAt": "2025-09-29T17:24:05Z",
  "digests": {"manifest": "sha256:abc..."},
  "steps": [{"id":"fetch","digest":"sha256:def...","status":"ok","durationMs": 5000}],
  "policyDecisions": [{"pack":"residency","allow":true}],
  "signature": "BASE64..."
}
```

`scripts/verify_receipt.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
receipt=${1:-receipt.json}
cosign verify-blob --signature ${receipt}.sig $receipt
jq -e '.executionId and .signature' $receipt >/dev/null
```

---

## 10) Observability (SLOs + Dashboards + Probes)

`docs/slo/MC_SLO.yaml`
```yaml
service: mc-api
slos:
  - name: publish_to_start_latency
    objective: 0.95
    windowDays: 28
    metric: histogram:mc_publish_to_start_ms
    thresholdMs: 5000
  - name: availability
    objective: 0.999
    windowDays: 28
    metric: rate:5m:http_5xx_total
    threshold: 0.001
budgets:
  errorBudgetMinutes: 30
```

`apps/mc-api/probes/synthetic.sh`
```bash
#!/usr/bin/env bash
set -e
curl -fsS https://api.${ORG}.com/${ENV}/healthz | grep ok
```

---

## 11) Runbook & Rollback

`docs/runbooks/MC_RUNBOOK.md`
```md
# MC Production Runbook

## Key Endpoints
- /api/workflows, /api/executions, /api/executions/{id}/receipt

## SLOs
- p95 publish→start < 5s; 99.9% availability

## Dashboards
- Grafana: MC Overview, Policy Decisions, Receipts Verification

## Alerts
- High deny rate (>5% /10m)
- Receipt verification failure > 0 in 5m
- Error budget burn > 10%/h

## Pager
- Primary: Orchestrator SRE; Secondary: Platform SRE

## Canary & Rollback
- Canary weight 10%. Auto‑rollback on:
  - p95 > 900ms for 5m
  - errorRate > 1% for 5m
- Manual: `helm rollback mc <rev>`
- DR Drill: quarterly
```

---

## 12) Canary Manager — Webhook Contract
`docs/release/canary-manager-contract.md`
```md
# Canary Manager Webhook

**POST** `${CM_URL}/breach`
```json
{ "service": "mc", "metric": "p95LatencyMs", "value": 1120, "threshold": 900 }
```
**Response**: `200` triggers rollback workflow; emits audit event `mc.rollback`
```

---

## 13) Jira Import (expanded)
`docs/jira/mc-sprint.csv`
```csv
Summary,Issue Type,Parent,Labels,Description
Manifest v1 schema,Story,EPIC-MC-CP,mc;schema,Implement manifest schema & validator
Publish lifecycle,Story,EPIC-MC-CP,mc;publish,Immutable snapshot with semver bump
Dry-run executor,Story,EPIC-MC-CP,mc;dryrun,Policy eval and cost plan no side effects
Execute with receipts,Story,EPIC-MC-CP,mc;receipts,Signed receipts per run
Policy packs v1,Story,EPIC-MC-POL,mc;opa,Residency, PII, Budget, Quotas
Cosign signing,Story,EPIC-MC-PROV,mc;cosign,Sign and verify receipts
Disclosure exporter,Story,EPIC-MC-PROV,mc;export,Bundle sbom+receipt+logs
CLI init/plan/run/status,Story,EPIC-MC-SDK,mc;cli,Dev CLI paved road
Canary manager + rollback,Story,EPIC-MC-SRE,mc;release,Auto rollback on breach
Golden dashboards,Story,EPIC-MC-SRE,mc;obs,Latencies, denies, receipts
SBOM & vuln budget,Story,EPIC-MC-SEC,mc;sbom,Vuln budget gate in CI
Secret scanning & drift,Story,EPIC-MC-SEC,mc;security,Gitleaks+Trivy+drift alerts
```

---

## 14) PR Checklist (DoR/DoD Attachment)
`docs/templates/PR_CHECKLIST.md`
```md
- [ ] ADR linked and status updated
- [ ] Tests: unit/integration/e2e; coverage report uploaded
- [ ] SBOM generated and attached; vuln budget report
- [ ] OPA policy results attached (deny/explain)
- [ ] Runbook & SLO updates included
- [ ] Rollback plan and verification steps
- [ ] Release notes drafted
```

---

## 15) Example Release Notes
`docs/release/notes-0.1.0.md`
```md
# MC 0.1.0
## Highlights
- Manifest v1, signed receipts, canary + rollback
## Changes
- Control plane endpoints GA
## Security
- SBOM attached; CVE budget met
## Ops
- p95 publish→start 3.8s; deny rate 0.7%
## Migrations
- None
```

---

## 16) Makefile (convenience)
`Makefile`
```make
.PHONY: plan run verify helm:canary helm:rollback
plan:
	maestro plan -m apps/mc-cli/templates/workflow.yaml
run:
	maestro run -w $$WORKFLOW_ID --canary
verify:
	./scripts/verify_receipt.sh receipt.json
helm:canary:
	helm upgrade mc infra/helm/mc -f infra/helm/mc/values.yaml
helm:rollback:
	helm rollback mc $$REV
```

---

> Drop these files into the repo at the indicated paths. Adjust org/env, wire secrets, and proceed with the merge train.
```

