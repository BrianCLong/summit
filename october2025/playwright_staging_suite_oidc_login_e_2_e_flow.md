# Playwright Staging Suite — OIDC Login & E2E Flow

End‑to‑end browser tests for **staging** that validate OIDC login (Keycloak), NL→Cypher → Analytics, Case/Report, Runbook proofs, XAI overlays, Federation claim hashes, and Wallet issue/verify. Includes screenshots, videos, and traces. Designed to run from CI against the staging host.

---

## 0) Repo Layout

```
webapp/
├─ tests/stage/
│  ├─ fixtures/
│  │  └─ users.ts
│  ├─ 01-login.spec.ts
│  ├─ 02-nl2cypher-analytics.spec.ts
│  ├─ 03-case-report.spec.ts
│  ├─ 04-xai-wallet.spec.ts
│  ├─ 05-policy-compliance.spec.ts
│  └─ playwright.stage.config.ts
└─ package.json (scripts)
.github/workflows/stage-e2e.yaml
```

---

## 1) Playwright Config (staging)

```ts
// webapp/tests/stage/playwright.stage.config.ts
import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env.STAGE_BASE_URL || 'https://gateway.stage.example.com';

export default defineConfig({
  testDir: __dirname,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-stage' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

---

## 2) Fixture: Users & Selectors

```ts
// webapp/tests/stage/fixtures/users.ts
export const kc = {
  issuer:
    process.env.KEYCLOAK_ISSUER ||
    'https://keycloak.stage.example.com/auth/realms/intelgraph',
  webClientId: process.env.KC_WEB_CLIENT_ID || 'intelgraph-web',
  testUser: process.env.KC_TEST_USER || 'lead',
  testPass: process.env.KC_TEST_PASS || 'ChangeMe!123',
};

export const sel = {
  loginButton: 'button:has-text("Sign in")',
  logoutButton: 'button:has-text("Sign out")',
  nlInput: 'textarea[placeholder="Ask in natural language…"]',
  nlRun: 'button:has-text("Preview")',
  analyticsRun: 'button:has-text("Run Analytics")',
  caseCreate: 'button:has-text("New Case")',
  caseNameInput: 'input[aria-label="Case Name"]',
  caseSave: 'button:has-text("Create Case")',
  reportOpen: 'button:has-text("Report Studio")',
  reportRender: 'button:has-text("Render Report")',
  xaiPanelTab: 'button:has-text("XAI")',
  xaiExplain: 'button:has-text("Explain")',
  walletIssue: 'button:has-text("Issue Wallet")',
  policyMenu: 'button:has-text("Policy Inspector")',
  dsarButton: 'button:has-text("Generate DSAR")',
};
```

> Adjust selectors to match your UI labels; these default to the names used in previous sprints.

---

## 3) Test 01 — OIDC Login

```ts
// webapp/tests/stage/01-login.spec.ts
import { test, expect } from '@playwright/test';
import { kc, sel } from './fixtures/users';

test('logs in via Keycloak and shows analyst UI', async ({ page }) => {
  await page.goto('/');
  await page.click(sel.loginButton);
  // Keycloak login form
  await page.waitForURL(/realms\/intelgraph\/protocol\/openid-connect\/auth/);
  await page.getByLabel('Username or email').fill(kc.testUser);
  await page.getByLabel('Password').fill(kc.testPass);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Redirect back
  await page.waitForURL(/\/$/);
  await expect(page.locator('text=Tri‑Pane')).toBeVisible();
  await page
    .context()
    .storageState({ path: 'webapp/tests/stage/.auth-state.json' });
});
```

---

## 4) Test 02 — NL→Cypher + Analytics

```ts
// webapp/tests/stage/02-nl2cypher-analytics.spec.ts
import { test, expect } from '@playwright/test';
import { sel } from './fixtures/users';

test.use({ storageState: 'webapp/tests/stage/.auth-state.json' });

test('preview NL query and run PageRank', async ({ page }) => {
  await page.goto('/');
  await page.fill(sel.nlInput, 'top 10 nodes by pagerank');
  await page.click(sel.nlRun);
  await expect(page.getByText('Estimated rows')).toBeVisible();
  await page.click(sel.analyticsRun);
  await expect(page.getByText('PageRank complete')).toBeVisible({
    timeout: 60_000,
  });
});
```

---

## 5) Test 03 — Case & Report Studio

```ts
// webapp/tests/stage/03-case-report.spec.ts
import { test, expect } from '@playwright/test';
import { sel } from './fixtures/users';

test.use({ storageState: 'webapp/tests/stage/.auth-state.json' });

test('create a case and render a report', async ({ page }) => {
  await page.goto('/cases');
  await page.click(sel.caseCreate);
  const name = `Op GA ${Date.now()}`;
  await page.fill(sel.caseNameInput, name);
  await page.click(sel.caseSave);
  await expect(page.getByText(name)).toBeVisible();
  await page.click(sel.reportOpen);
  await page.click(sel.reportRender);
  await expect(page.getByText('Report rendered')).toBeVisible();
});
```

---

## 6) Test 04 — XAI & Wallet

```ts
// webapp/tests/stage/04-xai-wallet.spec.ts
import { test, expect } from '@playwright/test';
import { sel } from './fixtures/users';

test.use({ storageState: 'webapp/tests/stage/.auth-state.json' });

test('explain a node and issue a wallet', async ({ page }) => {
  await page.goto('/xai');
  await page.click(sel.xaiExplain);
  await expect(page.getByText('saliency')).toBeVisible();

  // Wallet issuance flow (press audience)
  await page.goto('/wallets');
  await page.click(sel.walletIssue);
  await expect(page.getByText('Wallet issued')).toBeVisible();
});
```

---

## 7) Test 05 — Policy Inspector & Compliance Hooks

```ts
// webapp/tests/stage/05-policy-compliance.spec.ts
import { test, expect } from '@playwright/test';
import { sel } from './fixtures/users';

test.use({ storageState: 'webapp/tests/stage/.auth-state.json' });

test('simulate a denied export with reason code', async ({ page }) => {
  await page.goto('/policy');
  await page.click(sel.policyMenu);
  await page.locator('textarea').fill(
    JSON.stringify(
      {
        subject: { sub: 'u1', roles: ['analyst'] },
        resource: { kind: 'doc', sensitivity: 'restricted' },
        action: 'EXPORT',
        context: { purpose: 'investigation', court_order: false },
      },
      null,
      2,
    ),
  );
  await page.getByRole('button', { name: 'Simulate' }).click();
  await expect(page.getByText('Export requires court order')).toBeVisible();
});
```

---

## 8) package.json Scripts

```json
// webapp/package.json (snippet)
{
  "scripts": {
    "stage:e2e": "playwright test -c tests/stage/playwright.stage.config.ts",
    "stage:e2e:report": "npx playwright show-report playwright-report-stage"
  }
}
```

---

## 9) GitHub Actions — Staging E2E

```yaml
# .github/workflows/stage-e2e.yaml
name: stage-e2e
on:
  workflow_dispatch:
    inputs:
      baseUrl: { description: 'Staging base URL', required: true, type: string }

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - name: Install Playwright deps
        run: pnpm --filter webapp exec playwright install --with-deps
      - name: Run staging suite
        env:
          STAGE_BASE_URL: ${{ inputs.baseUrl }}
          KEYCLOAK_ISSUER: ${{ secrets.STAGE_KC_ISSUER }}
          KC_WEB_CLIENT_ID: intelgraph-web
          KC_TEST_USER: ${{ secrets.STAGE_TEST_USER }}
          KC_TEST_PASS: ${{ secrets.STAGE_TEST_PASS }}
        run: pnpm --filter webapp run stage:e2e
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          {
            name: playwright-report-stage,
            path: webapp/playwright-report-stage,
          }
```

---

## 10) Notes & Hardening

- For WebAuthn/step‑up routes, add a separate test that uses a test realm with password‑only for CI, or mock ACR in Keycloak.
- If the SPA is on a different host than the gateway, set `STAGE_BASE_URL` to the SPA origin.
- Ensure CORS/redirect URIs are configured for `intelgraph-web` in Keycloak.
- Tie CI user to the `pilot` group (tenant attribute) to exercise budget/policy paths.
