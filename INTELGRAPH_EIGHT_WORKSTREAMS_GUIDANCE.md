# IntelGraph: Eight Parallel Workstreams — PR Templates + CI Gates (drop-in)

Paste this into the repo root as a guidance doc; copy each file block to its path. All eight teams can start from these PR templates and CI gates with clean merges.

---

## Repo tree additions

```
.github/
  workflows/
    ci.yml
  PULL_REQUEST_TEMPLATE/
    1-prov-ledger-ga.md
    2-policy-lac-gateway.md
    3-ai-copilot-nl2cypher.md
    4-ingest-wizard-v1.md
    5-analytics-kernel-v1.md
    6-case-spaces-abac.md
    7-report-studio-disclosure.md
    8-ops-slo-cost-guard.md
  ISSUE_TEMPLATE/
    tech-spec.md
CODEOWNERS
CONTRIBUTING.md
k6/
  policy-hot-path.js
playwright/
  e2e-nl2cypher.spec.ts
jest.config.ts
package.json (scripts section only; merge-safe)
tsconfig.json (strict flags)
```

---

## `.github/workflows/ci.yml`

```yaml
name: intelgraph-ci
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci

  lint:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  unit:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --ci --reporters=default --reporters=jest-junit

  e2e:
    runs-on: ubuntu-latest
    needs: [unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e

  perf-budget:
    runs-on: ubuntu-latest
    needs: [unit]
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: npm ci
      - name: Run k6 smoke (policy hot path)
        run: k6 run k6/policy-hot-path.js

  sbom:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - name: Generate SBOM (CycloneDX)
        run: npx @cyclonedx/cyclonedx-npm --spec-version 1.5 --output-file sbom.json

  quality-gates:
    runs-on: ubuntu-latest
    needs: [e2e, perf-budget, sbom]
    steps:
      - name: Verify required job statuses
        run: echo "All gates passed"
```

---

## `CODEOWNERS`

```
# Core areas
/services/prov-ledger/        @intelgraph/provenance-team
/gateway/policy-lac/          @intelgraph/policy-team
/server/ai/nl2cypher/         @intelgraph/ai-team
/apps/web/ingest-wizard/      @intelgraph/ingest-team
/services/graph-analytics/    @intelgraph/analytics-team
/services/cases/              @intelgraph/cases-team
/services/audit/              @intelgraph/cases-team
/services/auth/               @intelgraph/platform-auth
/apps/web/report-studio/      @intelgraph/reporting-team
/services/disclosure/         @intelgraph/reporting-team
/services/cost-guard/         @intelgraph/ops-team
```

---

## `CONTRIBUTING.md` (excerpt)

```md
- Use Conventional Commits (feat:, fix:, perf:, refactor:, test:, docs:)
- One PR = one functional slice. Keep templates intact.
- All PRs must:
  - Include updated ADRs/docs as needed
  - Pass lint, typecheck, unit, e2e, k6 smoke
  - Add/extend contract tests and fixtures
```

---

## `package.json` (scripts only; merge-safe)

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "jest",
    "e2e": "playwright test",
    "k6:policy": "k6 run k6/policy-hot-path.js"
  }
}
```

---

## `tsconfig.json` (strict flags)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

---

## `.github/ISSUE_TEMPLATE/tech-spec.md`

```md
---
name: Tech Spec
about: Design/ADR before coding
---
## Context
## Goals / Non-Goals
## Interfaces / Contracts
## Data model / Migrations
## Security / Privacy
## Testing plan (unit, contract, e2e, perf)
## Rollout / Observability / SLOs
```

---

## k6/policy-hot-path.js (smoke perf budget)

```js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 5, duration: '30s', thresholds: { http_req_duration: ['p(95)<500'] } };

export default function () {
  const res = http.post('http://localhost:4000/policy/explain', JSON.stringify({ query: '{ secureAction }' }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

---

## playwright/e2e-nl2cypher.spec.ts (golden-path)

```ts
import { test, expect } from '@playwright/test';

test('NL→Cypher preview→approve flow', async ({ page }) => {
  await page.goto('http://localhost:3000/devtools/nl2cypher');
  await page.fill('[data-testid="nl-input"]', 'Find shortest path between A and B over follows edges');
  await page.click('[data-testid="btn-generate"]');
  await expect(page.locator('[data-testid="cypher-preview"]')).toContainText('MATCH');
  await expect(page.locator('[data-testid="plan-estimate"]')).toContainText('rows');
  await page.click('[data-testid="btn-approve"]');
  await expect(page.locator('[data-testid="sandbox-result"]')).toContainText('rows:');
});
```

---

# Eight PR templates

> Copy each block to `.github/PULL_REQUEST_TEMPLATE/{n}-*.md`.

### 1. `1-prov-ledger-ga.md`

```md
# Prov-Ledger GA — Verifiable Evidence & Claim Manifests

## Scope
- Service: services/prov-ledger (TS)
- CLI: tools/prov/ig-prov-verify
- Contracts: Claim, Evidence, Manifest; events: EvidenceRegistered, ClaimContradiction, ManifestSealed

## Acceptance Criteria
- Generate/verify manifest with Merkle root; offline verifier passes
- Export bundle includes license tags and transform lineage per field
- Jest ≥90% stmt; Playwright export+verify green; SBOM present

## Test Plan
- `npm test -w services/prov-ledger`
- `npm run e2e -w apps/web/report-studio`
- Golden fixtures in `/fixtures/prov-ledger/*`

## Security/Privacy
- Signed manifests; tamper detection; license compliance

## Migration/Docs
- DB migrations versioned; README with verifier quickstart
```

### 2. `2-policy-lac-gateway.md`

```md
# License/Authority Compiler (LAC) at API Edge

## Scope
- Gateway plugin: gateway/policy-lac (Apollo)
- Policy store: policies/*.json + compiled bytecode
- API: POST /policy/explain

## Acceptance Criteria
- Unsafe ops are blocked with human-readable reasons
- Policy simulation/diff tool produces stable snapshots
- 100% fixture policy coverage; k6 p95<500ms

## Test Plan
- `npm test -w gateway/policy-lac`
- `npm run k6:policy`
```

### 3. `3-ai-copilot-nl2cypher.md`

```md
# NL→Cypher Sandbox with Cost Estimator

## Scope
- Service: server/ai/nl2cypher
- GraphQL: mutation runNlQuery(text)
- UI devtool with preview/approve, explain panel

## Acceptance Criteria
- ≥95% syntactic validity on prompt suite
- Cost/row estimates shown before approve
- Red-team prompts logged; undo/rollback supported

## Test Plan
- `npm test -w server/ai/nl2cypher`
- `npm run e2e` (playwright/e2e-nl2cypher.spec.ts)
```

### 4. `4-ingest-wizard-v1.md`

```md
# Ingest Wizard + Schema-Aware ETL Assistant (v1)

## Scope
- App: apps/web/ingest-wizard (React + MUI + jQuery DOM flows)
- Workers: ingestion/workers/*
- Connectors: CSV/Parquet, RSS, STIX/TAXII, S3, MISP

## Acceptance Criteria
- AI field mapping with lineage per field
- PII classifier + license tagging
- Five connectors pass conformance suite

## Test Plan
- `npm test -w ingestion`
- Fixture datasets under /fixtures/ingest
```

### 5. `5-analytics-kernel-v1.md`

```md
# Graph Analytics Kernel (paths/community/centrality)

## Scope
- Service: services/graph-analytics
- GraphQL: analytics/* job endpoints with tickets

## Acceptance Criteria
- Shortest/K-paths; Louvain/Leiden; betweenness/eigenvector
- Reproducibility (seeded) + explainability payloads
- Load-test N=50k nodes meets perf SLOs

## Test Plan
- Synthetic benchmark graph fixtures + tolerance bands
```

### 6. `6-case-spaces-abac.md`

```md
# Case Spaces + Audit Trail + ABAC (OPA) + SCIM/OIDC

## Scope
- Services: services/cases, services/audit, services/auth
- ABAC labels; reason-for-access prompts; WebAuthn step-up

## Acceptance Criteria
- Immutable audit (who/what/when) queriable
- Step-up auth on sensitive reads
- SCIM provisioning flows green in E2E
```

### 7. `7-report-studio-disclosure.md`

```md
# Brief/Report Studio + Disclosure Packager (PDF/HTML)

## Scope
- App: apps/web/report-studio; Server: services/disclosure
- Inputs must be cited evidence only

## Acceptance Criteria
- Redactions retained; portable provenance wallet generated
- Deterministic PDF/HTML renders (image diffs within threshold)
- External verifier accepts bundles; revocation toggle works
```

### 8. `8-ops-slo-cost-guard.md`

```md
# Observability + Cost Guard

## Scope
- OTEL traces; Prometheus metrics; services/cost-guard
- Admin console: slow-query killer, budgets, tiering

## Acceptance Criteria
- SLO dashboards (p95 latency, ingest E2E) live
- Query budgeter + kill/allow-list enforced
- Chaos drill runbooks included; cold tier lifecycle documented
```

```
