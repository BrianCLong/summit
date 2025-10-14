```markdown
# Sprint 2025-09-29 — Artifacts & Scaffolds
**Slug/Version:** `sprint-2025-09-29-intelgraph-summit-artifacts-v1.0.0`

This package contains ready-to-drop files, templates, and stubs referenced by the sprint plan. Copy/paste or save-as into the repo paths noted in each header.

---

## 1) Repo Skeleton (create if missing)
```bash
# put into scripts/setup/scaffold.sh and run
mkdir -p \
  client/src/features/investigation/{graph,timeline,map,citations,policy} \
  server/src/{api,auth,policy,audit,nl2cypher} \
  ingestion/connectors/{splunk,s3csv,reddit}/tests \
  policy/opa/{bundles,tests} \
  ops/{otel,dashboards,costs} \
  docs/{gtm,compliance,evidence} \
  scripts/demo seed reports
```

---

## 2) Makefile Targets (root `Makefile`)
```makefile
.PHONY: up up-ai up-full smoke demo down logs ps seed
up: ## Start minimal stack for golden path
	docker compose -f docker-compose.yml up -d --build

up-ai: ## Start stack incl. AI services
	docker compose -f docker-compose.yml -f compose.ai.yml up -d --build

up-full: ## Start full stack incl. connectors
	docker compose -f docker-compose.yml -f compose.full.yml up -d --build

smoke: ## Run smoke tests (unit + e2e light)
	npm -w client test -- --watch=false && npm -w server test -- --run && npx cypress run --spec e2e/golden_path.cy.ts

demo: up ## Run scripted demo
	bash scripts/demo/golden_path.sh

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

seed:
	node scripts/seed.js
```

---

## 3) GitHub Actions — CI & Security (`.github/workflows/ci.yml`)
```yaml
name: ci
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install
        run: npm ci --workspaces
      - name: Lint & Unit Tests
        run: |
          npm -w client run lint && npm -w server run lint
          npm -w client test -- --watch=false
          npm -w server test -- --run
      - name: Cypress e2e (golden path)
        uses: cypress-io/github-action@v6
        with:
          working-directory: ./client
          spec: cypress/e2e/golden_path.cy.ts
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM (CycloneDX)
        uses: CycloneDX/gh-node-module-generatebom@v3
        with: { output: evidence/sbom/cyclonedx.json }
      - name: Trivy scan
        uses: aquasecurity/trivy-action@0.20.0
        with: { scan-type: fs, ignore-unfixed: true, severity: CRITICAL,HIGH }
      - name: CodeQL
        uses: github/codeql-action/init@v3
        with: { languages: javascript }
      - name: CodeQL Analyze
        uses: github/codeql-action/analyze@v3
```

---

## 4) OpenAPI Contract Skeleton (`openapi.yaml`)
```yaml
openapi: 3.0.3
info:
  title: Summit IntelGraph API
  version: 0.1.0
servers:
  - url: /api
paths:
  /entities/{id}:
    get:
      summary: Get entity by ID
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200': { description: OK }
  /search:
    get:
      summary: Search entities and relationships
      parameters:
        - in: query
          name: q
          schema: { type: string }
      responses:
        '200': { description: OK }
  /audit:
    get:
      summary: Query audit log
      responses:
        '200': { description: OK }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - bearerAuth: []
```

---

## 5) OPA ABAC Policy (Rego) (`policy/opa/bundles/investigation.rego`)
```rego
package summit.authz

default allow = false

# Personas mapped via JWT claims or session
is_investigator { input.user.role == "investigator" }
is_supervisor { input.user.role == "supervisor" }
is_reviewer { input.user.role == "reviewer" }

# Attribute gates
has_clearance(level) { level := input.user.clearance }
object_sensitivity(obj) := lvl { lvl := obj.labels.sensitivity }

allow {
  is_investigator
  object_sensitivity(input.object) <= has_clearance(_)
}

allow {
  is_supervisor
}

# Redaction contract for UI
redactions := r {
  r := {k: v | k := i; v := input.object.fields[i]; v.sensitive}
}
```

---

## 6) Audit Log Hash Chain (server snippet `server/src/audit/hashchain.ts`)
```ts
import crypto from 'crypto'

export type AuditRecord = {
  ts: string
  actor: string
  action: string
  target: string
  payloadHash: string
  prevHash: string
}

export function seal(record: Omit<AuditRecord,'prevHash'>, prevHash: string) {
  const data = `${record.ts}|${record.actor}|${record.action}|${record.target}|${record.payloadHash}|${prevHash}`
  const hash = crypto.createHash('sha256').update(data).digest('hex')
  return { ...record, prevHash: hash }
}
```

---

## 7) NL→Cypher Interface (server stub `server/src/nl2cypher/service.ts`)
```ts
export type NLQuery = { question: string; tenantId: string; persona: string }
export type CypherPlan = { cypher: string; rationale: string; parameters?: Record<string,any> }

export async function generatePlan(q: NLQuery): Promise<CypherPlan> {
  // placeholder: swap with orchestrator call
  return {
    cypher: 'MATCH (e:Entity) WHERE e.name CONTAINS $q RETURN e LIMIT 25',
    rationale: 'Keyword match over name (demo stub)',
    parameters: { q: q.question }
  }
}
```

---

## 8) Splunk Connector (skeleton `ingestion/connectors/splunk/index.ts`)
```ts
import axios from 'axios'

export async function splunkSearch({ baseUrl, token, query }: { baseUrl:string; token:string; query:string }) {
  const r = await axios.post(`${baseUrl}/services/search/jobs/export`, `search=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  // TODO: parse results to normalized event model
  return r.data
}
```

---

## 9) S3/CSV Loader (skeleton `ingestion/connectors/s3csv/loader.ts`)
```ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import csv from 'csv-parser'

export async function loadCsv({ bucket, key }: { bucket:string; key:string }) {
  const s3 = new S3Client({})
  const stream = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return new Promise<any[]>((resolve) => {
    const rows:any[] = []
    // @ts-ignore
    stream.Body.pipe(csv()).on('data', (d:any) => rows.push(d)).on('end', () => resolve(rows))
  })
}
```

---

## 10) Demo Script (`scripts/demo/golden_path.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Seeding sample data" && npm run seed

echo "[2/6] Enabling connectors" && node scripts/connectors_enable.js --splunk --s3

echo "[3/6] Ingest demo datasets" && node scripts/ingest_demo.js

echo "[4/6] Run NL→Cypher demo query" && curl -sS localhost:8080/api/search?q="Show recent alerts linked to Vendor X" | jq .

echo "[5/6] Fetch audit log" && curl -sS localhost:8080/api/audit | jq '.items | length'

echo "[6/6] Open UI at http://localhost:5173"
```

---

## 11) Cypress Golden Path (`client/cypress/e2e/golden_path.cy.ts`)
```ts
describe('Golden Path', () => {
  it('loads, searches, shows citations and policy banner', () => {
    cy.visit('/')
    cy.contains('Policy in Effect').should('exist')
    cy.get('[data-testid="global-search"]').type('Vendor X{enter}')
    cy.contains('Citations').should('exist')
  })
})
```

---

## 12) TCO Calculator Spec (`docs/gtm/tco_spec.json`)
```json
{
  "version": "0.1.0",
  "inputs": {
    "tenants": { "type": "number" },
    "analyst_seats": { "type": "number" },
    "events_per_day": { "type": "number" },
    "ai_calls_per_day": { "type": "number" },
    "storage_gb": { "type": "number" }
  },
  "unit_costs": {
    "compute_per_core_hour": 0.12,
    "storage_per_gb_month": 0.02,
    "ai_per_1k_tokens": 0.004
  },
  "scenarios": ["pilot", "production-small", "production-med"],
  "outputs": ["monthly_cost", "annual_cost", "per_analyst_cost"]
}
```

---

## 13) Pilot Offer Template (`docs/gtm/pilot_offer.md`)
```markdown
# Summit Pilot Offer (8 Weeks)
**Price Options:** $75k fixed **or** $45k + go-live milestone
**Scope:** up to 3 datasets (Splunk, CSV/S3, optional Reddit), 10 seats, single tenant
**Success Criteria:** P50 TTI ≤ 5m; Policy audit; Referenceable champion
**Deliverables:** Deployed stack, runbook, evidence bundle, exec readout
**Procurement Paths:** OTA/CSO-ready language; CRADA optional
**Exit:** Production proposal w/ ramp pricing
```

---

## 14) Capability Statement (Gov) (`docs/gtm/capability_statement_gov.md`)
```markdown
**Company:** Summit / IntelGraph / Maestro Conductor  
**CAGE / UEI:** TBA  
**NAICS:** 511210, 518210, 541511, 541512  
**Core Competencies:** Provenance-first AI, Graph analytics, Policy/Audit, Deploy-anywhere  
**Differentiators:** Chain-of-custody, ABAC/OPA guardrails, NL→Cypher, connectors  
**Past Performance:** (insert abstracts)  
**Compliance:** CMMC posture, SBOM/SBOM, SSDF, FedRAMP path  
**POCs:** Felix (BD), SecEng Lead, Program Manager
```

---

## 15) Evidence Bundle Index (`docs/evidence/README.md`)
```markdown
- sbom/cyclonedx.json
- compliance/security_whitepaper.md
- compliance/data_handling.md
- compliance/ai_responsible_use.md
- policies/opa_bundles.zip
- demo/video_link.md
- test-reports/smoke-summary.md
```

---

## 16) Security Whitepaper Outline (`docs/compliance/security_whitepaper.md`)
```markdown
# Security Whitepaper (Rev A)
1. Architecture overview
2. Data classification & handling
3. Identity, authN/Z (ABAC/OPA)
4. DLP & redaction
5. Audit & provenance (hash chain)
6. Supply chain (SBOM, SLSA)
7. Deployment models (VPC, on‑prem, air‑gap)
8. Incident response & logging
9. Compliance map (CMMC/FedRAMP path)
```

---

## 17) Product Feedback Packet (`reports/product_feedback_template.md`)
```markdown
# Product Feedback — Week of {{DATE}}
- Deal Impact ($$):
- Affected Opportunities:
- Severity: P0/P1/P2
- Request:
- Proposed Smallest Viable Change:
- Evidence (logs/screens/quotes):
```

---

## 18) Weekly Pipeline Report (`reports/sprint_2025-09-29_weekly.md`)
```markdown
# Weekly Pipeline — Week of {{DATE}}
## Summary
- New ARR Added:
- Coverage vs Target:
- Top Risks & Unblockers:

## Movement by Stage
| Account | Stage → | Owner | Next Step | Date |
|---|---|---|---|---|

## Pilot Metrics
- TTI P50/P95:
- Latency P95:
- Errors / SLO:
```

---

## 19) Outreach Kit (3‑touch sequence) (`docs/gtm/outreach_sequence.md`)
```markdown
### Email 1 — Problem/Proof
Subject: Provenance‑first AI for investigations (demo in 5 mins)
Hi {{FN}}, teams like {{peer}} cut TTI from hours → minutes with IntelGraph + policy‑gated AI. 10‑min demo?

### Email 2 — Compliance/Control
Subject: Audit, ABAC, and deploy‑anywhere
We enforce ABAC via OPA, tamper‑evident audit, and on‑prem/VPC patterns. Pilot in 6–8 weeks.

### Email 3 — Offer
Subject: Pilot slot for {{QTR}}
We’ll wire Splunk + S3, ship dashboards, and hand over an evidence bundle. Two pricing paths—interested?

### LinkedIn Snippet
Provenance‑first AI → grounded answers with audit trails. Pilots open this quarter. DM for demo.
```

---

## 20) Redaction UI Contract (`client/src/features/policy/redaction.contract.json`)
```json
{
  "visible": ["name", "type", "timestamp"],
  "masked": ["pii.email", "pii.ssn", "location.precise"],
  "policyBanner": "Access governed by OPA ABAC — {{persona}}"
}
```

---

**Owner:** Felix (The B.I.Z.)  
**Last Updated:** Sep 29, 2025 (v1.0.0)
```

