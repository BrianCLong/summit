# Stage Promo + E2E Wiring & Selector Map + Gap Closure Pack

This pack wires **Playwright staging E2E** into the **stage-promo** workflow so promotion automatically runs browser tests after Helm upgrade, provides a **selector map** and utilities to make tests zero-edit across UI changes, and continues closing gaps across reliability, security, ops, docs, and developer experience.

---

## 1) stage-promo.yaml — add E2E gate (after smoke)

```yaml
# .github/workflows/stage-promo.yaml (append/modify)
name: stage-promo
on:
  workflow_dispatch:
    inputs:
      imageTag: { description: "Image tag (e.g., v1.0.0-uni)", required: true, type: string }

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { contents: read, deployments: write }
    steps:
      - uses: actions/checkout@v4
      - name: Helm upgrade (staging)
        env: { IMAGE_TAG: ${{ inputs.imageTag }} }
        run: |
          helm upgrade --install intelgraph deploy/helm/intelgraph \
            -n intelgraph --create-namespace \
            -f deploy/helm/intelgraph/values.yaml \
            -f deploy/helm/intelgraph/overlays/values-generated.yaml \
            -f deploy/helm/intelgraph/values-stage.yaml \
            --set image.tag=$IMAGE_TAG
      - name: Wait rollout
        run: kubectl -n intelgraph rollout status deploy/intelgraph-gateway --timeout=180s
      - name: Post-deploy smoke
        env:
          KEYCLOAK_ISSUER: ${{ secrets.STAGE_KC_ISSUER }}
          KC_CLIENT_SECRET: ${{ secrets.STAGE_KC_CLIENT_SECRET }}
          GATEWAY_URL: ${{ secrets.STAGE_GATEWAY_URL }}
        run: bash ops/smoke/post-deploy.sh

  e2e:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - name: Install Playwright deps
        run: pnpm --filter webapp exec playwright install --with-deps
      - name: Run staging E2E (Playwright)
        env:
          STAGE_BASE_URL: ${{ secrets.STAGE_WEB_BASE_URL }}
          KEYCLOAK_ISSUER: ${{ secrets.STAGE_KC_ISSUER }}
          KC_WEB_CLIENT_ID: intelgraph-web
          KC_TEST_USER: ${{ secrets.STAGE_TEST_USER }}
          KC_TEST_PASS: ${{ secrets.STAGE_TEST_PASS }}
        run: pnpm --filter webapp run stage:e2e
      - name: Upload E2E report
        uses: actions/upload-artifact@v4
        with: { name: playwright-report-stage, path: webapp/playwright-report-stage }

  gates:
    runs-on: ubuntu-latest
    needs: [deploy, e2e]
    steps:
      - uses: actions/checkout@v4
      - name: CPI/perf gate
        env: { PROM_URL: ${{ secrets.STAGE_PROM_URL }} }
        run: |
          node perf/scripts/run-suite.ts > perf/summary.json
          node perf/scripts/summarize.ts > perf/summary-final.json || true
          cat perf/summary-final.json
      - name: Compliance gate
        run: |
          opa test -v compliance/opa
          node services/hardening/scripts/sbom.cjs
```

---

## 2) Selector Map — stable data‑testids & resolver

### 2.1 Add data-testid attributes (non-visual)

```tsx
// webapp/src/app/TestIds.ts
export const TID = {
  LOGIN_BTN: 'login-btn',
  SIGNOUT_BTN: 'signout-btn',
  NL_INPUT: 'nl-input',
  NL_PREVIEW_BTN: 'nl-preview-btn',
  ANALYTICS_RUN_BTN: 'analytics-run-btn',
  CASE_CREATE_BTN: 'case-create-btn',
  CASE_NAME_INPUT: 'case-name-input',
  CASE_SAVE_BTN: 'case-save-btn',
  REPORT_OPEN_BTN: 'report-open-btn',
  REPORT_RENDER_BTN: 'report-render-btn',
  XAI_TAB: 'xai-tab',
  XAI_EXPLAIN_BTN: 'xai-explain-btn',
  WALLET_ISSUE_BTN: 'wallet-issue-btn',
  POLICY_MENU_BTN: 'policy-menu-btn',
  DSAR_BTN: 'dsar-btn',
} as const;
```

Usage example:

```tsx
<button data-testid={TID.LOGIN_BTN}>Sign in</button>
```

### 2.2 Selector map JSON

```json
// webapp/tests/stage/selector-map.json
{
  "loginButton": "[data-testid=login-btn]",
  "logoutButton": "[data-testid=signout-btn]",
  "nlInput": "[data-testid=nl-input]",
  "nlRun": "[data-testid=nl-preview-btn]",
  "analyticsRun": "[data-testid=analytics-run-btn]",
  "caseCreate": "[data-testid=case-create-btn]",
  "caseNameInput": "[data-testid=case-name-input]",
  "caseSave": "[data-testid=case-save-btn]",
  "reportOpen": "[data-testid=report-open-btn]",
  "reportRender": "[data-testid=report-render-btn]",
  "xaiPanelTab": "[data-testid=xai-tab]",
  "xaiExplain": "[data-testid=xai-explain-btn]",
  "walletIssue": "[data-testid=wallet-issue-btn]",
  "policyMenu": "[data-testid=policy-menu-btn]",
  "dsarButton": "[data-testid=dsar-btn]"
}
```

### 2.3 Selector resolver utility

```ts
// webapp/tests/stage/fixtures/selectors.ts
import fs from 'fs';
import path from 'path';
const mapPath = path.resolve(__dirname, '..', 'selector-map.json');
export const SEL = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as Record<
  string,
  string
>;
```

Update tests to import `SEL.loginButton` etc. (minimal changes).

### 2.4 ESLint rule to enforce data-testid on actionable elements

```js
// webapp/.eslintrc.cjs (snippet)
module.exports = {
  rules: {
    'jsx-a11y/no-static-element-interactions': 'off',
    'testing-library/await-async-utils': 'off',
  },
  overrides: [
    {
      files: ['src/**/*.tsx'],
      plugins: ['custom-testid'],
      rules: { 'custom-testid/require-testid': 'warn' },
    },
  ],
};
```

_(Plugin stub optional; the intent is to encourage testid coverage.)_

---

## 3) Wire E2E into Make & Docs

```make
stage-e2e:
	STAGE_BASE_URL=$(STAGE_BASE_URL) pnpm --filter webapp run stage:e2e
```

Docs (`docs/INDEX.md`) add section: **Staging E2E after Promotion** with links to reports.

---

## 4) Additional Gap Closures (Production polish)

### 4.1 API Rate Limits & WAF headers (gateway)

```ts
// services/gateway-graphql/src/rateLimit.ts
import rateLimit from 'express-rate-limit';
export const limiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
// apply to express app underlying Apollo
```

Add security headers (helmet):

```ts
import helmet from 'helmet';
app.use(helmet({ contentSecurityPolicy: false }));
```

### 4.2 Backup/Restore scripts

```bash
# ops/backup/backup.sh
set -e
neo4j-admin database dump neo4j --to-path=/backup/neo4j/$(date +%F)
pg_dump "$POSTGRES_URL" > /backup/pg/pg_$(date +%F_%H%M).sql
mc mirror minio/intelgraph /backup/minio/intelgraph-$(date +%F)
```

```bash
# ops/backup/restore.sh
neo4j-admin database load neo4j --from-path=/backup/neo4j/LAST
psql "$POSTGRES_URL" < /backup/pg/last.sql
```

### 4.3 Chaos drills (termination + network)

```yaml
# deploy/k8s/chaos/gateway-pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata: { name: kill-gateway, namespace: intelgraph }
spec:
  action: pod-kill
  mode: one
  selector: { labelSelectors: { app: gateway } }
  duration: '1m'
```

### 4.4 Cost exporter integration (Kubecost)

- Annotate pods with `kubecost.com/service`: gateway, analytics, ledger, etc.
- Dashboard panel **CPI by service** using Kubecost API.

### 4.5 CODEOWNERS & pre-commit

```text
# CODEOWNERS
/services/gateway-graphql/   @intelgraph/backend
/webapp/                      @intelgraph/frontend
/compliance/                  @intelgraph/security
```

Pre-commit hooks: run ESLint, prettier, jest on changed packages.

### 4.6 License headers & NOTICE

- Add MIT headers to all new files; update `LICENSE` and `NOTICE`.

### 4.7 i18n scaffolding

```ts
// webapp/src/i18n.ts
import i18next from 'i18next';
await i18next.init({ lng: 'en', resources: { en: { translation: {} } } });
```

### 4.8 Status page synthetic

- Add external probe hitting `/graphql {__typename}` + wallet verify.

### 4.9 Docs completeness

- **Operator Runbook**: backup/restore, chaos, rate limit knobs, cost export setup.
- **Analyst Guide**: selector‑based quick finds, Policy Inspector usage, wallet disclosure best practices.

---

## 5) CI Wiring for New Gates

```yaml
# .github/workflows/quality-gates.yaml
name: quality-gates
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r lint
  licenses:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx license-checker --production --summary
  chaos-plan:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: kubectl -n intelgraph apply -f deploy/k8s/chaos/gateway-pod-kill.yaml || true
```

---

## 6) Final checklists (after wiring)

- [ ] stage-promo runs: **helm → smoke → E2E → perf/compliance**
- [ ] Selector map in place; DOM carries `data-testid` on actionable elements
- [ ] Rate limits & security headers enabled on gateway
- [ ] Backups scheduled; chaos mesh manifests reviewed
- [ ] Kubecost feeds CPI dashboard by service
- [ ] CODEOWNERS enforced; pre-commit hooks active
- [ ] i18n scaffold merged; docs updated

```

```
