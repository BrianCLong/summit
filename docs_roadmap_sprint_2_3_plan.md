---
title: Docs Roadmap – Sprint 2 & 3 Plan
summary: Concrete, PR-ready steps to strengthen coverage, navigation, and governance after the initial docs foundation.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Goals (next 2–4 weeks)

- **Coverage**: Every feature has at least one How-to and one Reference page.
- **Findability**: Users reach answers in ≤3 clicks via sidebars, cross-links, and search.
- **Governance**: Versioning, release notes, and a docs freeze gate integrated with CI.
- **Quality**: A11y checks, alt text linting, and diagram render tests added to the Docs Quality gate.

---

# Priority Backlog (ordered)

## 1) API Reference polish (Redoc routes + samples + errors)

- **Add Redocusaurus plugin** and route both OpenAPI specs.
- **Generate code samples** (curl/JavaScript/Python) for common endpoints.
- **Central Error Catalog**: map error codes/messages with remediation.

**Changes**

- `docs-site/docusaurus.config.js` (plugin block below)
- `docs/reference/api/` (add overview pages + error catalog)
- `scripts/api/generate-samples.(ts|js)` (optional – see stub)

```js
// docusaurus.config.js – add Redoc + redirects
plugins: [
  [
    'redocusaurus',
    {
      specs: [
        {
          id: 'maestro',
          spec: '../api/maestro-orchestration-api.yaml',
          route: '/intelgraph/api/maestro/1.0.0',
        },
        {
          id: 'core',
          spec: '../api/intelgraph-core-api.yaml',
          route: '/intelgraph/api/core/1.0.0',
        },
      ],
      theme: { primaryColor: '#0f766e' },
    },
  ],
  [
    '@docusaurus/plugin-client-redirects',
    { redirects: [{ from: '/api', to: '/intelgraph/api/core/1.0.0' }] },
  ],
];
```

````md
## <!-- docs/reference/api/error-catalog.md -->

title: API Error Catalog
summary: Standard error formats, codes, and troubleshooting guidance for IntelGraph APIs.
version: latest
lastUpdated: 2025-09-07
owner: api

---

## Error envelope

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "<human readable>",
    "correlationId": "<uuid>",
    "details": {}
  }
}
```
````

## Common codes

| Code                 | When it happens                   | HTTP | Action                  |
| -------------------- | --------------------------------- | ---: | ----------------------- |
| `INVALID_ARGUMENT`   | Bad field, type, or missing param |  400 | Fix request; see schema |
| `UNAUTHENTICATED`    | Missing/invalid token             |  401 | Re-auth; refresh token  |
| `PERMISSION_DENIED`  | Caller lacks rights               |  403 | Request access/role     |
| `RESOURCE_NOT_FOUND` | ID/path not found                 |  404 | Verify ID/route         |
| `ABORTED`            | Concurrency conflict              |  409 | Retry with backoff      |
| `INTERNAL`           | Unexpected server error           |  500 | Retry; contact support  |

````

```ts
// scripts/api/generate-samples.ts – stub using openapi-snippet
import fs from 'node:fs'
import path from 'node:path'
import { default as oas } from 'openapi3-ts'
import httpsnippet from 'httpsnippet'

const specPath = path.resolve(__dirname, '../../api/intelgraph-core-api.yaml')
const spec = fs.readFileSync(specPath, 'utf8')
// Parse spec (use your preferred parser), then for a few key endpoints build samples:
// new HTTPSnippet(har).convert('shell', 'curl') etc. Write mdx fragments into docs/reference/api/samples/
````

**Acceptance**

- Both specs render at their routes, sidebars link present.
- At least 5 endpoints documented with code tabs (curl/JS/Python).
- Error catalog linked from both API pages.

---

## 2) Navigation & cross-linking (reach answers in ≤3 clicks)

- **Footer cross-links**: "See also" + "Next steps" appear on every page.
- **Keyword aliases**: Add synonyms in headings or front-matter `tags` to improve search hits.

**Changes**

- `src/theme/DocItem/Footer/index.js` (swizzle once)

```jsx
// Minimal footer swizzle to surface tags + related links
import React from 'react';
import { useDoc } from '@docusaurus/theme-common/internal';

export default function DocItemFooter() {
  const { metadata } = useDoc();
  const { tags } = metadata;
  return (
    <div className="mt-12 border-t pt-6">
      {tags && tags.length > 0 && (
        <p>
          <strong>Tags:</strong> {tags.map((t) => t.label).join(', ')}
        </p>
      )}
      <div className="grid gap-2">
        <a href="#see-also">See also</a>
        <a href="#next-steps">Next steps</a>
      </div>
    </div>
  );
}
```

**Acceptance**

- 90%+ pages contain `## See also` and `## Next steps` sections (lint rule below).

---

## 3) Lint rules: alt text + required sections + owners

- Enforce **image alt text** and **required headings**; validate `owner` against an allowlist.

**Changes**

- `.markdownlint.jsonc`
- `docs/.owners.json`
- `scripts/docs/validate-frontmatter.(ts|js)`

```jsonc
// .markdownlint.jsonc additions
{
  "MD045": true, // images should have alt text
  "MD025": { "front_matter_title": "any" }, // allow H1 via front-matter
}
```

```json
// docs/.owners.json
{ "owners": ["docs", "api", "platform", "ml", "infra", "security"] }
```

```js
// scripts/docs/validate-frontmatter.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const owners = new Set(require('../../docs/.owners.json').owners);

let fail = false;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const fm = matter(src).data || {};
      if (!fm.owner || !owners.has(fm.owner)) {
        console.error(`Missing/invalid owner in ${p}`);
        fail = true;
      }
      if (!/##\s*See also/i.test(src)) {
        console.error(`Missing 'See also' section in ${p}`);
        fail = true;
      }
      if (!/##\s*Next steps/i.test(src)) {
        console.error(`Missing 'Next steps' section in ${p}`);
        fail = true;
      }
    }
  }
}
walk(path.resolve(__dirname, '../../docs'));
process.exit(fail ? 1 : 0);
```

```yaml
# .github/workflows/docs-quality.yml – add validator step
- name: Validate front-matter/sections
  run: |
    npm i gray-matter@4
    node scripts/docs/validate-frontmatter.js
```

**Acceptance**

- CI fails if alt text missing, sections missing, or owner invalid.

---

## 4) Versioning workflow + /latest alias

- Snapshot docs on release tags; maintain `/docs/latest` alias.

**Changes**

- `.github/workflows/docs-versioning.yml`

```yaml
name: Docs Versioning
on:
  push:
    tags: ['v*.*.*']
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci || true
      - name: Version docs from tag
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          npx docusaurus docs:version $VERSION --path docs-site
      - name: Commit versioned docs
        run: |
          git config user.name "docs-bot"
          git config user.email "docs-bot@users.noreply.github.com"
          git add -A && git commit -m "docs: version $VERSION" || echo "No changes"
          git push
```

**Acceptance**

- New tag → versioned docs directory appears; `latest` label points to current by config.

---

## 5) Search: DocSearch (Algolia) configuration

- Integrate Algolia DocSearch for instant search; add synonyms.

**Changes**

- `docusaurus.config.js` (replace placeholders)

```js
// docusaurus.config.js – search
themeConfig: {
  algolia: {
    appId: 'APP_ID',
    apiKey: 'PUBLIC_SEARCH_KEY',
    indexName: 'intelgraph_docs',
    contextualSearch: true,
    searchParameters: { optionalWords: ['GraphRAG','graph rag','orchestration','workflow'] }
  }
}
```

**Acceptance**

- Search working in preview; queries for synonyms return expected pages.

---

## 6) Runbooks to production-grade

- Ensure every runbook has: Purpose • Preconditions • Steps • Expected outputs • Rollback • KPIs/alerts.

**Changes**

- `docs/_templates/runbook.md` (below)
- Update existing runbooks to match.

```md
---
title: <Runbook name>
summary: Purpose + outcome in 1–2 lines.
version: latest
owner: ops
---

## Purpose

## Preconditions

- Access/roles required
- Dependencies

## Steps

1. …

## Expected outputs

- What you should see after each step

## Rollback

- Undo steps / safe restore procedure

## KPIs & alerts

- SLO, SLIs, dashboards, alert names

## See also

- Related runbooks, on-call docs

## Next steps

- Follow-up checks / handoff
```

**Acceptance**

- All runbooks conform; CI passes template checks.

---

## 7) A11y + build verification gate

- Build the site in CI and run **pa11y-ci** on a critical pageset.
- Keep Lychee link check post-build (to catch generated links).

**Changes**

- `.github/workflows/docs-build.yml`
- `.pa11yci`

```yaml
name: Docs Build & A11y
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci || true
      - name: Build docs
        run: |
          cd docs-site && npm i && npm run build
      - name: A11y audit
        run: npx pa11y-ci --config .pa11yci
      - name: Post-build link check
        run: lychee --config lychee.toml ./docs-site/build
```

```json
// .pa11yci
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 30000
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/reference/",
    "http://localhost:3000/tutorials/first-ingest",
    "http://localhost:3000/intelgraph/api/core/1.0.0"
  ]
}
```

> Note: for CI, serve `docs-site/build` with a static server (e.g., `npx serve`) and point pa11y to that port.

**Acceptance**

- CI fails on WCAG AA violations for target pages.

---

## 8) Weekly stale-docs sweep (automated)

- Flag docs whose `lastUpdated` is older than 120 days or owners set to deprecated teams.

**Changes**

- `scripts/docs/stale-report.(ts|js)`
- `.github/workflows/docs-stale-report.yml`

```js
// scripts/docs/stale-report.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 120; // 120 days
const out = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const { data } = matter.read(p);
      const d = new Date(data.lastUpdated || 0).getTime();
      if (!d || d < cutoff)
        out.push({
          file: p,
          owner: data.owner || 'unknown',
          lastUpdated: data.lastUpdated || 'n/a',
        });
    }
  }
}
walk('docs');
fs.writeFileSync('docs-stale-report.json', JSON.stringify(out, null, 2));
console.log(`Found ${out.length} potentially stale docs`);
```

```yaml
# .github/workflows/docs-stale-report.yml
name: Docs Stale Report
on:
  schedule: [{ cron: '0 12 * * 1' }] # Mondays
  workflow_dispatch:
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i gray-matter@4
      - run: node scripts/docs/stale-report.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-stale-report, path: docs-stale-report.json }
```

**Acceptance**

- Weekly artifact produced; triage creates issues for top stale pages.

---

## 9) Codeowners & branch protections for docs

- Require review from `@intelgraph/docs` on `docs/**` and `docs-site/**`.

**Changes**

- `CODEOWNERS`

```ini
# Docs
/docs/* @intelgraph/docs
/docs-site/* @intelgraph/docs
```

**Acceptance**

- PRs touching docs request docs team automatically.

---

## 10) Templates for Tutorials/How-tos/Concepts

```md
## <!-- docs/_templates/how-to.md -->

title: <Task-oriented title>
summary: One paragraph describing the task and outcome.
version: latest
owner: <team>

---

## Prerequisites

## Steps

## Validation

## Troubleshooting

## See also

## Next steps
```

```md
## <!-- docs/_templates/tutorial.md -->

title: <End-to-end tutorial>
summary: Guided, step-by-step walkthrough to achieve a goal.
version: latest
owner: <team>

---

## Overview

## Prerequisites

## Step 1 — …

## Step 2 — …

## Wrap-up

## See also

## Next steps
```

```md
## <!-- docs/_templates/concept.md -->

title: <Concept name>
summary: Explanation of the why and the tradeoffs.
version: latest
owner: <team>

---

## Problem

## Solution

## Trade-offs & alternatives

## See also

## Next steps
```

**Acceptance**

- New/updated pages conform to templates; CI validates presence of required sections.

---

# Stretch Items (nice-to-haves)

- **Diagrams CI**: run `mmdc` for Mermaid and `plantuml` for `.puml` files to catch syntax errors.
- **Analytics**: plug in Plausible/GA4 for search terms and exit pages to focus doc improvements.
- **Localization hooks**: prepare i18n pipeline (strings extraction, `i18n/` folder).

---

# Execution Plan (suggested order)

1. API Reference polish (routes, sample generation stub, error catalog).
2. Footer swizzle + lint rules for cross-links/owners.
3. Versioning workflow on tags + `/latest` label confirmation.
4. DocSearch config + synonyms.
5. Runbook template retrofit.
6. Build + A11y CI gate.
7. Stale report job + CODEOWNERS.

---

# Definition of Done (Docs)

- ✅ Accurate to current code/UX and tested against running build/API stubs.
- ✅ Clear task steps with copy-paste examples.
- ✅ Visuals updated or confirmed N/A.
- ✅ Cross-links added; glossary terms linked.
- ✅ Version tags and changelog updated.
- ✅ CI doc checks pass; site builds without warnings.
- ✅ Accessibility: alt text present; headings hierarchy valid; no color-only meaning.
