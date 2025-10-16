---
title: Docs Phase 15–16: Community, Dual-Build (Public/Internal), and Editorial Experiments
summary: Open the docs to contributors, ship dual builds for public vs internal audiences, harden quality with readability/asset budgets, and add lightweight A/B copy experiments.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Community**: Clear contribution paths, labeling, triage, and CoC.
- **Dual-build**: Public vs Internal docs from one repo using `visibility` front‑matter.
- **Quality**: Readability checks, asset budgets, and external link allowlists.
- **Experiments**: Safe, lightweight copy experiments with metrics.

---

# Track A — Community Enablement

## A1) CONTRIBUTING, CoC, and Contributors page

- `CONTRIBUTING.md` — setup, preview, style, how to add pages, how to run CI locally.
- `CODE_OF_CONDUCT.md` — standard CoC (Contributor Covenant v2.1).
- `docs/CONTRIBUTORS.md` — monthly rollup (scripted) of doc contributors.

```md
<!-- CONTRIBUTING.md (skeleton) -->

# Contributing to IntelGraph Docs

## Quickstart

1. Fork & clone
2. `npm i` then `cd docs-site && npm i`
3. `npm run docs:dev` (with Prism mock)

## Guidelines

- Use templates in `docs/_templates/`
- Add `## See also` and `## Next steps`
- Alt text for all images
- Run `npm run docs:check` before push
```

**`scripts/docs/contributors.js`**

```js
const { execSync } = require('child_process');
const fs = require('fs');
const list = execSync(
  'git log --since="30 days ago" --pretty=%aN -- docs docs-site | sort | uniq',
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
const md = `---\ntitle: Docs Contributors (Last 30 days)\nowner: docs\n---\n\n${list.map((n) => `- ${n}`).join('\n')}\n`;
fs.writeFileSync('docs/CONTRIBUTORS.md', md);
```

**CI (monthly)** `.github/workflows/docs-contributors.yml`

```yaml
name: Docs Contributors Rollup
on:
  schedule: [{ cron: '0 8 1 * *' }]
  workflow_dispatch:
jobs:
  rollup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/contributors.js
      - run: |
          git config user.name 'docs-bot'
          git config user.email 'docs-bot@users.noreply.github.com'
          git add docs/CONTRIBUTORS.md && git commit -m 'docs: monthly contributors' || echo 'no changes'
          git push || true
```

## A2) Labeler + Issue/PR Automation

**`.github/labeler.yml`**

```yaml
how-to:
  - docs/how-to/**
reference:
  - docs/reference/**
concepts:
  - docs/concepts/**
runbooks:
  - docs/**/runbook*.md
```

**`.github/workflows/labeler.yml`**

```yaml
name: Auto Label Docs PRs
on: [pull_request]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with: { sync-labels: true }
```

**Issue Form** `.github/ISSUE_TEMPLATE/translation_request.yml`

```yaml
name: Translation request
labels: [docs, i18n]
body:
  - type: input
    id: page
    attributes: { label: Page path }
  - type: input
    id: locale
    attributes: { label: Target locale }
  - type: textarea
    id: notes
    attributes: { label: Notes }
```

---

# Track B — Dual Build: Public vs Internal

## B1) Front‑matter `visibility`

- Add `visibility: public|internal|partner` to pages as needed (defaults to `public`).

## B2) Filter script

**`scripts/docs/filter-by-visibility.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const mode = process.env.DOCS_VISIBILITY || 'public';
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      const vis = g.data.visibility || 'public';
      if (mode === 'public' && vis !== 'public') fs.unlinkSync(p);
      if (mode === 'partner' && !['public', 'partner'].includes(vis))
        fs.unlinkSync(p);
    }
  }
}
walk('docs');
console.log('Filtered docs for', mode);
```

## B3) Two builds, one repo

**`docs-site/docusaurus.config.public.js`** and **`docusaurus.config.internal.js`** (import base, differ by title, urls, analytics keys).

**Workflow** `.github/workflows/docs-dual-build.yml`

```yaml
name: Docs Dual Build
on: [workflow_dispatch]
jobs:
  public:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/filter-by-visibility.js
        env: { DOCS_VISIBILITY: public }
      - run: cd docs-site && npm i && npx docusaurus build --config docusaurus.config.public.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-public, path: docs-site/build }
  internal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/filter-by-visibility.js
        env: { DOCS_VISIBILITY: internal }
      - run: cd docs-site && npm i && npx docusaurus build --config docusaurus.config.internal.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-internal, path: docs-site/build }
```

**Acceptance**

- Public build excludes internal/partner pages; internal build includes all.

---

# Track C — Readability, Asset Budgets, External Link Allowlist

## C1) Readability check (Flesch–Kincaid)

**`scripts/docs/readability.js`**

````js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const TextStatistics = require('text-statistics');
let fail = false;
function body(md) {
  return md.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      const txt = body(g.content);
      const ts = new TextStatistics(txt);
      const grade = ts.fleschKincaidGradeLevel();
      if (grade > 10 && (g.data.type || '') !== 'reference') {
        console.warn(`High grade level (${grade.toFixed(1)}): ${p}`);
      }
    }
  }
})('docs');
process.exit(fail ? 1 : 0);
````

**CI** add step:

```yaml
- name: Readability check
  run: |
    npm i text-statistics@0.1.1
    node scripts/docs/readability.js
```

## C2) Asset budget (image size)

**`scripts/docs/asset-budget.js`**

```js
const fs = require('fs');
const path = require('path');
let fail = false;
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(png|jpg|jpeg|gif|svg)$/i.test(f)) {
      if (s.size > 800 * 1024) {
        console.error(`Image exceeds 800KB: ${p}`);
        fail = true;
      }
    }
  }
}
walk('docs');
process.exit(fail ? 1 : 0);
```

## C3) External link allowlist

**`docs/_meta/allowed-domains.txt`**

```
intelgraph.com
github.com
npmjs.com
```

**`scripts/docs/check-external-links.js`**

```js
const fs = require('fs');
const path = require('path');
const allowed = new Set(
  fs
    .readFileSync('docs/_meta/allowed-domains.txt', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean),
);
let fail = false;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const md = fs.readFileSync(p, 'utf8');
      for (const m of md.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
        const host = new URL(m[1]).host.replace(/^www\./, '');
        if (![...allowed].some((d) => host.endsWith(d))) {
          console.error(`Disallowed external link in ${p}: ${m[1]}`);
          fail = true;
        }
      }
    }
  }
})('docs');
process.exit(fail ? 1 : 0);
```

**CI** add step:

```yaml
- name: External link allowlist
  run: node scripts/docs/check-external-links.js
```

---

# Track D — Editorial Experiments (A/B copy)

## D1) Variant shortcode

**`src/components/Variant.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
export default function Variant({
  a,
  b,
  id,
}: {
  a: React.ReactNode;
  b: React.ReactNode;
  id: string;
}) {
  const [v, setV] = useState<'a' | 'b'>('a');
  useEffect(() => {
    const key = `exp:${id}`;
    const cur =
      (localStorage.getItem(key) as 'a' | 'b' | null) ||
      (Math.random() < 0.5 ? 'a' : 'b');
    localStorage.setItem(key, cur);
    setV(cur);
  }, [id]);
  return <>{v === 'a' ? a : b}</>;
}
```

**Usage** in MDX:

```mdx
import Variant from '@site/src/components/Variant';

<Variant
  id="quickstart-callout"
  a={<p>Start with the 5‑minute quickstart.</p>}
  b={<p>Kick off with our guided tutorial.</p>}
/>
```

## D2) Event beacons (anonymous)

- Track which variant was shown via a tiny beacon (optional; pluggable to your analytics).

**Acceptance**

- Variant component renders one of two copy snippets; no build-time differences; accessible fallback is text-only.

---

# Execution Plan (5–7 days)

1. A1–A2: Community docs + labeler automation.
2. B1–B3: Dual-build filtering + two build workflows.
3. C1–C3: Readability, asset budgets, external link allowlist in CI.
4. D1–D2: Variant component + one experiment on homepage and quickstart.

---

# Acceptance Criteria

- CONTRIBUTING/CoC added and linked in footer; monthly contributors rollup lands automatically.
- Successful **public** and **internal** build artifacts produced on demand; visibility respected.
- CI flags overly large images and disallowed external links; readability report available.
- One active A/B copy experiment running with a clear owner and stop date.
