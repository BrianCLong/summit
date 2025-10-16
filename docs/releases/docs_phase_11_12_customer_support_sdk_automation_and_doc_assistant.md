---
title: Docs Phase 11–12: Customer Support, SDK Automation, and Doc Assistant
summary: Make docs a full product surface: auto-generate SDK & CLI refs from code, integrate support, add a searchable Doc Assistant, and harden performance & a11y.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Automate** references: generate SDK/CLI docs straight from source for drift-free coverage.
- **Assist** readers: embed a self-serve Doc Assistant and richer feedback loops.
- **Support**: connect docs to support workflows (triage → issues/KB).
- **Polish**: image optimization, accessible components, and content quickstarts.

---

# Track A — SDK & CLI Docs: Single Source of Truth

## A1) TypeScript/JS SDK → TypeDoc into Docusaurus

**`typedoc.json`**

```json
{
  "entryPoints": ["packages/sdk-js/src/index.ts"],
  "out": "docs/reference/sdk-js",
  "excludePrivate": true,
  "hideGenerator": true,
  "categorizeByGroup": false
}
```

**`scripts/docs/gen-sdk-js.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
npx typedoc --options typedoc.json
# add front-matter if missing
find docs/reference/sdk-js -name "*.md" -print0 | while IFS= read -r -d '' f; do
  if ! head -n1 "$f" | grep -q '^---$'; then
    sed -i '1i ---\nowner: api\nversion: latest\n---' "$f"
  fi
done
```

**CI step (docs-quality.yml)**

```yaml
- name: Generate JS SDK docs
  run: |
    npm i typedoc@^0.26
    bash scripts/docs/gen-sdk-js.sh
```

## A2) Python SDK → pdoc into /reference

**`scripts/docs/gen-sdk-py.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
pdoc -o docs/reference/sdk-py packages/sdk-py/intelgraph
```

**CI**

```yaml
- name: Generate Python SDK docs
  run: |
    pip install pdoc3
    bash scripts/docs/gen-sdk-py.sh
```

## A3) CLI Reference from `--help`

**`scripts/docs/gen-cli-ref.js`**

```js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cmds = ['intelgraph', 'intelgraph agents', 'intelgraph datasets'];
const outDir = 'docs/reference/cli';
fs.mkdirSync(outDir, { recursive: true });
for (const c of cmds) {
  const slug = c.replace(/\s+/g, '-');
  const help = execSync(`${c} --help`, { encoding: 'utf8' });
  const md = `---\ntitle: ${c} CLI\nowner: platform\nversion: latest\n---\n\n\n\n\n\n\n\n\n\n\n\n\n\`
${help.replace(/`/g, '\`')}
\`
`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), md);
}
```

**CI**

```yaml
- name: Generate CLI reference
  run: node scripts/docs/gen-cli-ref.js || echo "CLI not available in CI; skipping"
```

**Acceptance**

- `docs/reference/sdk-js`, `sdk-py`, and `reference/cli` generated; sidebars wired.

---

# Track B — Support Integration & Feedback Loops

## B1) Support links + severity chooser

Add a support page that routes readers by severity/role.

**`docs/support/index.md`**

```md
---
title: Get Support
summary: How to get help fast, by role and urgency.
owner: support
---

## If production is impacted

- Page on-call: #oncall-platform
- Create an Incident: link

## Ask a question / request a feature

- Open a Docs request issue
- Contact CSM

## Provide feedback on a page

- Use the thumbs on each page; it opens a pre-filled issue
```

## B2) Feedback auto-triage

**`scripts/docs/label-feedback.js`** (stub labels `docs-feedback`, assigns `@intelgraph/docs`).

**Workflow** `.github/workflows/docs-feedback-triage.yml`

```yaml
name: Docs Feedback Triage
on:
  issues:
    types: [opened, edited]
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue
            if (issue.title?.startsWith('Docs feedback:')){
              await github.rest.issues.addLabels({ ...context.repo, issue_number: issue.number, labels: ['docs','docs-feedback'] })
              await github.rest.issues.addAssignees({ ...context.repo, issue_number: issue.number, assignees: ['intelgraph-docs'] })
            }
```

---

# Track C — Doc Assistant (search + semantic Q&A)

## C1) Lightweight client-side semantic search (optional)

Add a Q&A page that pairs DocSearch with a small semantic reranker (client-side, toggleable).

**`docs/assistant/index.mdx`**

```mdx
---
title: Ask Doc Assistant
summary: Search docs and get suggested answers.
owner: docs
---

> Beta: May surface hallucinations; verify with linked sources.

<div id="doc-assistant" />
```

**`src/components/Assistant.tsx`** (stub wiring; implementation depends on allowed libs/keys)

## C2) Server (optional) — edge function that uses embeddings on `docs-site/build/index.json`.

- Emit `docs/search-index.json` during build; use it for retrieval.

**Acceptance**

- Page exists; if keys not configured, degrade gracefully to DocSearch-only.

---

# Track D — Performance & A11y Polish

## D1) Image optimization (lossless)

**`scripts/docs/optimize-images.js`**

```js
const fs = require('fs');
const path = require('path');
const imagemin = require('imagemin');
const mozjpeg = require('imagemin-mozjpeg');
const pngquant = require('imagemin-pngquant');
(async () => {
  const files = await imagemin(['docs/**/*.{jpg,jpeg,png}'], {
    destination: 'docs',
    plugins: [mozjpeg({ quality: 82 }), pngquant({ quality: [0.7, 0.85] })],
  });
  console.log('Optimized', files.length, 'images');
})();
```

**CI (manual job)** `.github/workflows/docs-optimize-images.yml`

```yaml
name: Optimize Doc Images
on: [workflow_dispatch]
jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i imagemin imagemin-mozjpeg imagemin-pngquant
      - run: node scripts/docs/optimize-images.js
      - run: git config user.name 'docs-bot'; git config user.email 'docs-bot@users.noreply.github.com'; git add -A; git commit -m 'chore(docs): optimize images' || echo 'no changes'; git push
```

## D2) Skip-to-content + focus outlines

**`src/theme/SkipToContent.tsx`**

```tsx
import React from 'react';
export default function Skip() {
  return (
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
  );
}
```

**`src/css/custom.css`**

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  left: 0;
  top: 0;
  width: auto;
  height: auto;
  background: #fff;
  padding: 0.5rem;
  z-index: 1000;
}
:focus {
  outline: 2px solid #0f766e;
  outline-offset: 2px;
}
```

---

# Track E — Quickstarts & Tutorials Refresh

**`docs/get-started/quickstart-5-min.md`**

```md
---
title: 5‑minute Quickstart
summary: Your first successful run, start to finish, in 5 minutes.
owner: docs
---

## Prerequisites

- Node/Python versions, keys (if any)

## Steps

1. Install
2. Configure
3. Run
4. Validate

## Troubleshooting

- Common first-run errors
```

---

# Track F — Governance & Ops

## F1) Docs OKRs (quarterly)

**`docs/ops/docs-okrs.md`** (seed table with 3–5 KRs)

## F2) Weekly Doc Debt triage automation

**`.github/workflows/docs-debt.yml`**

```yaml
name: Docs Debt Triage
on:
  schedule: [{ cron: '0 14 * * 5' }]
  workflow_dispatch:
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              ...context.repo,
              title: `Docs Debt — ${new Date().toISOString().slice(0,10)}`,
              body: 'Review stale report, zero-results, and metrics; file follow-ups.',
              labels: ['docs','docs-debt']
            })
```

---

# Execution Plan (1 week)

1. A1–A3: Auto-generate SDK & CLI docs and wire into sidebars.
2. D1: Image optimization pass.
3. B1: Support page + triage workflow.
4. C1: Assistant page shell (DocSearch first, semantic optional).
5. D2: Skip link + focus outlines.
6. E: 5‑min Quickstart.
7. F: OKRs + weekly docs-debt automation.

---

# Acceptance Criteria

- SDK/CLI references generated in CI on PRs; pages version with releases.
- Support page live; feedback issues auto-labeled/assigned.
- Assistant page live (graceful fallback to search-only).
- Images optimized; Lighthouse budgets remain ≥ target.
- A11y: skip link visible on focus; pa11y shows no new violations.
- Quickstart live; linked from homepage and Get Started.
- OKRs doc exists; weekly doc-debt issue created automatically.
