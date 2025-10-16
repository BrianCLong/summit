---
title: Docs Phase 9–10: Excellence, Live API, and Editorial Engine
summary: Cement world-class docs with live API consoles, style linting (Vale), performance budgets, semantic search tuning, and a small editorial engine.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Delight**: Add "Try it" live API consoles with safe mocking.
- **Consistency**: Enforce tone/terminology via Vale style lint.
- **Speed**: Keep the site fast with Lighthouse budgets.
- **Findability**: Tune search with synonyms harvested from analytics.
- **Scale**: Create a tiny CLI + editorial calendar to sustain velocity.

---

# Track A — Live API Consoles (mocked & gated)

## A1) Embed Swagger UI / RapiDoc in MDX (mocked via Prism)

Create a reusable MDX component that points to a local mock server (Prism) for safe "Try it".

**`src/components/TryApi.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';

export default function TryApi({
  specUrl,
  proxy,
}: {
  specUrl: string;
  proxy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (async () => {
      const SwaggerUI = (await import('swagger-ui-dist')).default;
      SwaggerUI({
        domNode: ref.current!,
        url: specUrl,
        tryItOutEnabled: true,
        requestInterceptor: (req: any) => {
          if (proxy) req.url = req.url.replace(/^https?:\/\/.+?\//, proxy);
          return req;
        },
      });
    })();
  }, [specUrl, proxy]);
  return <div ref={ref} />;
}
```

**Usage in MDX**

```mdx
import TryApi from '@site/src/components/TryApi';

> **Safe sandbox:** these calls hit a mock server, not production.

<TryApi
  specUrl="/intelgraph/api/core/1.0.0/openapi.json"
  proxy="http://localhost:4010/"
/>
```

## A2) Mock server in docs dev

Add Prism to dev scripts so contributors can "try" locally.

**`package.json`** (root or `docs-site/`)

```json
{
  "scripts": {
    "mock:core": "prism mock api/intelgraph-core-api.yaml -p 4010",
    "docs:dev": "run-p mock:core docs-site:start",
    "docs-site:start": "docusaurus start --dir docs-site"
  },
  "devDependencies": { "@stoplight/prism-cli": "^5", "npm-run-all": "^4" }
}
```

**Acceptance**

- MDX pages render Swagger UI; requests go to Prism; CI build unaffected.
- A11y: iframes/components pass pa11y.

---

# Track B — Style & Terminology Lint with Vale

## B1) Vale config + custom styles

**`.vale.ini`**

```ini
StylesPath = .vale
MinAlertLevel = warning
Packages = write-good
Vocab = IntelGraph
[*.{md,mdx}]
BasedOnStyles = Vale, write-good, IntelGraph
```

**`.vale/Vocab/IntelGraph/accept.txt`**

```
IntelGraph
Maestro
GraphRAG
ZIP Export
```

**`.vale/IntelGraph/Terms.yml`**

```yaml
extends: substitution
message: "Prefer '%s' over '%s'."
level: warning
ignorecase: true
swap:
  log-in: login
  sign into: sign in
  e-mail: email
```

**`.github/workflows/docs-vale.yml`**

```yaml
name: Docs Style (Vale)
on: [pull_request]
jobs:
  vale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: errata-ai/vale-action@v2
        with:
          files: 'docs/**/*.md*'
          reporter: github-pr-review
```

**Acceptance**

- PRs show inline comments for style/terminology issues.

---

# Track C — Performance Budgets (Lighthouse CI)

**`lighthouserc.js`**

```js
module.exports = {
  ci: {
    collect: {
      staticDistDir: 'docs-site/build',
      url: ['/', '/reference/', '/tutorials/first-ingest'],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'total-byte-weight': ['warn', { maxNumericValue: 600000 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

**`.github/workflows/docs-lhci.yml`**

```yaml
name: Docs Lighthouse CI
on: [pull_request]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd docs-site && npm i && npm run build
      - run: npx @lhci/cli autorun --config=lighthouserc.js
```

**Acceptance**

- CI enforces perf ≥0.90; flags heavy pages.

---

# Track D — Semantic Search Tuning

## D1) Synonyms pipeline (from analytics → config)

**`docs-site/algolia.synonyms.json`**

```json
[
  {
    "objectID": "graphrag",
    "type": "altCorrection1",
    "word": "GraphRAG",
    "corrections": ["graph rag", "graph-rag"]
  },
  {
    "objectID": "zip",
    "type": "synonym",
    "synonyms": ["zip export", "zip bundle", "certified zip"]
  }
]
```

**`scripts/docs/apply-synonyms.js`** (stub)

```js
console.log(
  'Fetch analytics → update algolia.synonyms.json via Algolia API (requires keys)',
);
```

**Acceptance**

- Synonyms file lives in repo; manual or automated push to Algolia.

---

# Track E — Docs CLI for scaffolding

**`scripts/docs/cli.js`**

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const type = process.argv[2] || 'how-to';
const title = process.argv.slice(3).join(' ') || 'New Page';
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const tpl = fs
  .readFileSync(`docs/_templates/${type}.md`, 'utf8')
  .replace('<Task-oriented title>', title)
  .replace('<End-to-end tutorial>', title)
  .replace('<Concept name>', title)
  .replace(
    'lastUpdated:',
    `lastUpdated: ${new Date().toISOString().slice(0, 10)}`,
  );
const out = `docs/${type === 'concept' ? 'concepts' : type}/${slug}.md`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, tpl);
console.log('Created', out);
```

**`package.json`**

```json
{
  "scripts": { "docs:new": "node scripts/docs/cli.js" }
}
```

**Acceptance**

- `npm run docs:new how-to "Rotate API keys"` scaffolds a page with front-matter.

---

# Track F — Navigation Smoke Tests (Playwright)

**`tests/docs-nav.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const pages = [
  '/',
  '/reference/',
  '/tutorials/first-ingest',
  '/how-to/zip-export',
];

for (const p of pages) {
  test(`navigates ${p}`, async ({ page }) => {
    await page.goto(process.env.BASE_URL || 'http://localhost:3000' + p);
    await expect(page).toHaveTitle(/IntelGraph/);
    const links = await page.locator('a').all();
    expect(links.length).toBeGreaterThan(10);
  });
}
```

**`.github/workflows/docs-playwright.yml`**

```yaml
name: Docs E2E
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd docs-site && npm i && npm run build && npx serve -s build -l 3000 &
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env: { BASE_URL: 'http://localhost:3000' }
```

**Acceptance**

- Basic navigation tests pass on PRs, preventing obvious 404s.

---

# Track G — Sitemaps, Redirects, and 404 Safety Net

**`docusaurus.config.js`** (ensure sitemap plugin + redirects configured) and add a custom 404 with search + top links.

**`src/pages/404.tsx`**

```tsx
import React from 'react';
import Link from '@docusaurus/Link';
export default function NotFound() {
  return (
    <main className="container margin-vert--lg">
      <h1>Page not found</h1>
      <p>Try search or jump to a top area:</p>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/reference">Reference</Link>
        </li>
        <li>
          <Link to="/how-to">How-tos</Link>
        </li>
      </ul>
    </main>
  );
}
```

**Acceptance**

- Sitemap generated; custom 404 improves recovery.

---

# Track H — Content Calendar & Changelog Discipline

- `docs/ops/content-calendar.md`: rolling 6-week plan tied to releases.
- `docs/CHANGELOG.md`: doc-visible changes per release, linked from PRs.

**`docs/ops/content-calendar.md`** (seed)

```md
| Week | Focus                    | Owner | Notes           |
| ---- | ------------------------ | ----- | --------------- |
| 1    | v24 upgrade improvements | docs  | gather feedback |
| 2    | Tutorials refresh        | docs  | add screenshots |
```

**Acceptance**

- Calendar exists and referenced in weekly triage.

---

# Execution Plan (1 week)

1. A1–A2: Live API + Prism mock in dev.
2. B1: Vale style lint (low risk, fast value).
3. C: Lighthouse CI budgets.
4. F: Playwright nav smoke tests.
5. D: Synonyms file (manual first), schedule automation later.
6. E: Docs CLI.
7. G–H: Sitemap/404 + editorial calendar.

---

# Acceptance Criteria

- Live API console available on at least 1 core and 1 maestro endpoint page.
- Vale comments appear on PRs and reduce repeated style nits.
- Lighthouse CI budgets enforced; no perf regressions on home/reference.
- Playwright smoke tests green; 404s caught early.
- `algolia.synonyms.json` lives in repo and referenced in ops playbook.
- Docs CLI scaffolds new pages with correct metadata.
