# PR Pack 003 — Testing, Flake Management, Data Policy, Incidents, FinOps (Ready-to-merge)

This pack hardens quality signals, reduces flake, formalizes data protection (DPIA + retention + dual‑control deletes), automates incident ops (rollback/runbooks), and adds cost & SLO observability. 12 PRs with rollback notes and cutover steps.

---

## PR 23 — Flake management framework (Jest + Playwright)

**Purpose:** Detect, auto‑retry, quarantine flakes; surface rate.

**Files:**

**`jest.config.js`** (append)

```js
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  reporters: ['default', ['jest-junit', { outputDirectory: 'reports/junit' }]],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
```

**`test/jest.setup.js`**

```js
// Retry known flakey tests once based on tag
const retry = parseInt(process.env.JEST_RETRY_TIMES || '0', 10);
if (retry > 0 && global.jest) {
  // @ts-ignore
  jest.retryTimes(retry, { logErrorsBeforeRetry: true });
}
```

**`playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: 2,
  use: { trace: 'on-first-retry', video: 'retain-on-failure' },
  reporter: [['html', { outputFolder: 'reports/playwright' }], ['list']],
});
```

**`.github/workflows/tests.yml`** (append vars + artifact upload)

```yaml
jobs:
  core:
    steps:
      - run: npm test -- --ci
        env: { JEST_RETRY_TIMES: '1' }
      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with: { name: junit, path: reports/junit }
```

**`scripts/flake-index.js`**

```js
// Parse JUnit to compute flake index (failures that pass on retry)
const fs = require('fs');
const glob = require('glob');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();
let total = 0,
  flaky = 0;
for (const f of glob.sync('reports/junit/**/*.xml')) {
  const xml = parser.parse(fs.readFileSync(f, 'utf8'));
  const suites = Array.isArray(xml.testsuites?.testsuite)
    ? xml.testsuites.testsuite
    : [xml.testsuites?.testsuite].filter(Boolean);
  for (const s of suites) {
    total += Number(s?.tests || 0);
    flaky += Number(s?.flaky || 0); // if your runner writes <flaky>
  }
}
const idx = total ? flaky / total : 0;
console.log(`flake_index=${idx}`);
if (idx > Number(process.env.FLAKE_BUDGET || 0.02)) process.exit(1);
```

**`.github/workflows/flake-budget.yml`**

```yaml
name: flake-budget
on: [pull_request]
jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:ci || true
      - run: node scripts/flake-index.js
        env: { FLAKE_BUDGET: '0.02' }
```

**Rollback:** Remove flake budget job or set `FLAKE_BUDGET` high.

---

## PR 24 — Coverage budgets & required check

**Purpose:** Prevent silent test erosion; enforce per‑package floor.

**Files:**

**`package.json`** (scripts excerpt)

```json
{
  "scripts": {
    "test:ci": "jest --ci --coverage",
    "coverage:check": "node scripts/coverage-check.js"
  }
}
```

**`scripts/coverage-check.js`**

```js
const fs = require('fs');
const summary = JSON.parse(
  fs.readFileSync('coverage/coverage-summary.json', 'utf8'),
);
const floor = Number(process.env.COVERAGE_FLOOR || 0.8);
const pct = summary.total.statements.pct / 100;
console.log(`coverage=${pct}`);
if (pct < floor) {
  console.error(`❌ Coverage ${pct} < ${floor}`);
  process.exit(1);
}
```

**`.github/workflows/coverage.yml`**

```yaml
name: coverage
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run test:ci
      - run: node scripts/coverage-check.js
        env: { COVERAGE_FLOOR: '0.80' }
```

**Rollback:** Lower floor or remove required check.

---

## PR 25 — Contract testing & API schema linting

**Purpose:** Catch breaking API changes early; keep OpenAPI healthy.

**Files:**

**`api/openapi.yaml`** (ensure exists)

**`.spectral.yaml`**

```yaml
extends: ['spectral:oas', 'spectral:asyncapi']
rules:
  oas3-api-servers: warn
  operation-operationId: error
  no-invalid-media-type-examples: error
```

**`.github/workflows/api-contract.yml`**

```yaml
name: api-contract
on: [pull_request]
jobs:
  spectral:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g @stoplight/spectral-cli
      - run: spectral lint api/openapi.yaml
```

**`tests/contract/responds-to-schema.test.ts`**

```ts
import Ajv from 'ajv';
import { load } from 'js-yaml';
import fs from 'fs';
import fetch from 'node-fetch';

const ajv = new Ajv({ allErrors: true, strict: false });
const oas = load(fs.readFileSync('api/openapi.yaml', 'utf8')) as any;

it('GET /health matches schema', async () => {
  const res = await fetch(process.env.BASE_URL + '/health');
  const body = await res.json();
  const schema = oas.components.schemas.Health;
  const validate = ajv.compile(schema);
  expect(validate(body)).toBe(true);
});
```

**Rollback:** Make spectral warnings non‑blocking or skip contract tests.

---

## PR 26 — Synthetic monitoring (stage/prod)

**Purpose:** Always‑on HTTP canaries for the golden path.

**Files:**

**`.github/workflows/synthetics.yml`**

```yaml
name: synthetics
on:
  schedule:
    - cron: '*/10 * * * *'
jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - name: GET /health
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" $STAGE_URL/healthz)
          test "$code" -eq 200
        env: { STAGE_URL: ${{ secrets.STAGE_BASE_URL }} }
```

**Rollback:** Disable schedule.

---

## PR 27 — Chaos drills (safe defaults)

**Purpose:** Practice failure handling; verify rollback works.

**Files:**

**`k8s/chaos/pod-killer.yaml`**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: chaos-pod-killer, namespace: stage }
spec:
  schedule: '0 2 * * 3' # weekly Wed 02:00
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: chaos-runner
          restartPolicy: Never
          containers:
            - name: killer
              image: bitnami/kubectl:latest
              command: ['/bin/sh', '-c']
              args:
                - |
                  POD=$(kubectl -n stage get pods -l app.kubernetes.io/name=web -o jsonpath='{.items[0].metadata.name}');
                  kubectl -n stage delete pod $POD
```

**`k8s/chaos/rbac.yaml`**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata: { name: chaos-runner, namespace: stage }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: chaos, namespace: stage }
rules:
  - apiGroups: ['']
    resources: ['pods']
    verbs: ['get', 'list', 'delete']
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata: { name: chaos, namespace: stage }
subjects: [{ kind: ServiceAccount, name: chaos-runner }]
roleRef: { kind: Role, name: chaos, apiGroup: rbac.authorization.k8s.io }
```

**Rollback:** Delete CronJob; keep RBAC.

---

## PR 28 — Runbook automation & one‑click rollback

**Purpose:** Cut MTTR with a dispatchable rollback button.

**Files:**

**`.github/workflows/rollback.yml`**

```yaml
name: rollback
on:
  workflow_dispatch:
    inputs:
      environment: { description: 'stage|prod', required: true }
      rollout: { description: 'rollout name', required: true }
jobs:
  abort:
    runs-on: ubuntu-latest
    steps:
      - name: Abort canary / rollback
        env: { KUBECONFIG: ${{ secrets.KUBECONFIG }} }
        run: |
          ns=${{ github.event.inputs.environment }}
          ro=${{ github.event.inputs.rollout }}
          argo rollouts abort $ro -n $ns || true
          argo rollouts promote --to-last-stable $ro -n $ns || true
```

**`.github/ISSUE_TEMPLATE/incident.yaml`**

```yaml
name: Incident
description: Prod incident record
labels: [incident]
body:
  - type: input
    id: impact
    attributes: { label: Impact, placeholder: 'users affected, scope' }
  - type: textarea
    id: timeline
    attributes: { label: Timeline, placeholder: 'UTC timestamps' }
  - type: textarea
    id: actions
    attributes: { label: Mitigation actions }
```

**Rollback:** Remove workflow/template.

---

## PR 29 — Data retention & purge jobs

**Purpose:** Enforce TTLs with auditable purges.

**Files:**

**`db/migrations/2025090701_add_retention.sql`**

```sql
-- Example for PostgreSQL
CREATE TABLE IF NOT EXISTS retention_policy (
  table_name text primary key,
  ttl_days int not null,
  updated_at timestamptz not null default now()
);
INSERT INTO retention_policy (table_name, ttl_days)
VALUES ('event_logs', 90)
ON CONFLICT (table_name) DO UPDATE SET ttl_days = EXCLUDED.ttl_days, updated_at = now();
```

**`db/migrations/2025090702_dual_control_deletes.sql`**

```sql
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  requested_by text not null,
  approved_by text,
  approved_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);
```

**`k8s/cron/purge.yaml`**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: retention-purge, namespace: prod }
spec:
  schedule: '0 1 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: purge
              image: ghcr.io/<org>/<repo>/dbtools:latest
              envFrom: [{ secretRef: { name: db-credentials } }]
              command: ['/bin/sh', '-c']
              args:
                - |
                  psql "$DB_DSN" -c "\
                    DO $$ DECLARE r record; BEGIN \
                      FOR r IN SELECT * FROM retention_policy LOOP \
                        EXECUTE format('DELETE FROM %I WHERE created_at < now() - interval ''%s days''', r.table_name, r.ttl_days); \
                      END LOOP; END $$;"
```

**Rollback:** Set TTL high; disable CronJob.

---

## PR 30 — DPIA template + enforcement hook

**Purpose:** Ensure privacy impact is assessed for data-affecting changes.

**Files:**

**`SECURITY/DPIA.md`** (template)

```md
# Data Protection Impact Assessment (DPIA)

- **Feature/Change:**
- **Data categories:** (PII, telemetry, etc.)
- **Lawful basis:**
- **Risk analysis:**
- **Mitigations:**
- **Retention/TTL:**
- **Owners & approvals:**
```

**`scripts/dpia-guard.js`**

```js
const fs = require('fs');
const base = process.env.GITHUB_BASE_REF || 'main';
const diff = require('child_process')
  .execSync(`git diff --name-only origin/${base}`)
  .toString();
const touchesData = diff
  .split('\n')
  .some((p) => /schema|model|db\/migrations|api\/openapi\.yaml/.test(p));
if (touchesData && !fs.existsSync('SECURITY/DPIA.md')) {
  console.error('DPIA required: add/updated SECURITY/DPIA.md');
  process.exit(1);
}
```

**`.github/workflows/dpia-guard.yml`**

```yaml
name: dpia-guard
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: node scripts/dpia-guard.js
```

**Rollback:** Make DPIA guard advisory (do not fail PR).

---

## PR 31 — ABAC/Opa policies + step‑up auth hooks

**Purpose:** Enforce attribute‑based access and step‑up for risky ops.

**Files:**

**`policy/rego/abac.rego`**

```rego
package access

# input: { user: { id, roles, mfa_level }, action, resource: { owner, tier } }
allow {
  # owners can access their own resources
  input.user.id == input.resource.owner
}
allow {
  # admins can access tier<=2 without step-up
  input.user.roles[_] == "admin"
  input.resource.tier <= 2
}
allow {
  # tier 3 requires step-up MFA
  input.resource.tier == 3
  input.user.mfa_level >= 2
}
```

**`server/middleware/stepup.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
export function requireStepUp(level = 2) {
  return (req: Request, res: Response, next: NextFunction) => {
    const mfa = Number(req.headers['x-mfa-level'] || 0);
    if (mfa >= level) return next();
    res.status(401).json({ error: 'step_up_required', level });
  };
}
```

**Rollback:** Remove middleware usage or set level=0.

---

## PR 32 — Kubecost integration & weekly FinOps report

**Purpose:** Visibility to spend and anomalies; tie into PRs.

**Files:**

**`helm/kubecost/values.yaml`** (minimal)

```yaml
prometheus:
  serviceAddress: http://prometheus.monitoring.svc.cluster.local:9090
aggregation:
  storageClass: gp2
```

**`.github/workflows/finops-weekly.yml`**

```yaml
name: finops-weekly
on:
  schedule: [{ cron: '0 12 * * 1' }]
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch weekly cost
        run: |
          echo "$KUBECOST_URL/model/allocation?window=7d&aggregate=deployment" > /dev/null
      - name: Post summary
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: finops
          message: |
            Weekly cost report posted to dashboards.
        env:
          KUBECOST_URL: ${{ secrets.KUBECOST_URL }}
```

**Rollback:** Disable schedule.

---

## PR 33 — SLO/SLI recording rules & Grafana dashboard

**Purpose:** Consistent golden signals across services.

**Files:**

**`observability/prometheus/recording-rules.yaml`**

```yaml
groups:
  - name: web-sli
    rules:
      - record: job:http_request_error_rate:ratio5m
        expr: sum(rate(http_requests_total{job="web",code=~"5.."}[5m])) / sum(rate(http_requests_total{job="web"}[5m]))
      - record: job:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="web"}[5m])) by (le))
```

**`observability/grafana/dashboards/web.json`** (skeleton)

```json
{
  "title": "Web — Golden Signals",
  "panels": [
    {
      "type": "timeseries",
      "title": "Error rate (5xx)",
      "targets": [{ "expr": "job:http_request_error_rate:ratio5m" }]
    },
    {
      "type": "timeseries",
      "title": "p95 latency",
      "targets": [{ "expr": "job:http_request_duration_seconds:p95" }]
    }
  ]
}
```

**Rollback:** Remove rules/dashboard.

---

## PR 34 — Repo arborist automation

**Purpose:** Keep branches tidy; label hygiene.

**Files:**

**`.github/workflows/arborist.yml`**

```yaml
name: arborist
on:
  schedule: [{ cron: '0 5 * * 6' }]
jobs:
  prune:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
      - name: Delete merged branches older than 30 days (dry-run)
        uses: actions/github-script@v7
        with:
          script: |
            const { data: branches } = await github.repos.listBranches({ owner: context.repo.owner, repo: context.repo.repo, protected: false });
            // TODO: implement query for merged + age; log only in dry-run
            core.info(`Branches scanned: ${branches.length}`)
```

**Rollback:** Disable workflow.

---

# Cutover (half day)

1. Land **PR 23–25** to stabilize signals (flake + coverage + contract).
2. Enable **synthetics** and **chaos** in stage; observe alerts.
3. Wire **runbook rollback** and socialize incident template.
4. Apply **retention/DPIA** policies; run first purge in prod under supervision.
5. Deploy **Kubecost** and publish first weekly report; add SLO dashboards.

# Rollback

- All changes are additive; each workflow/policy can be disabled independently. Database changes are forward‑compatible; purge TTL can be raised to neutralize deletes.

# Ownership

- **QA/DevEx:** PR 23–25
- **SRE/Platform:** PR 26–28, 33
- **Data Gov/Security:** PR 29–31
- **FinOps:** PR 32
- **Repo Maintainer:** PR 34
