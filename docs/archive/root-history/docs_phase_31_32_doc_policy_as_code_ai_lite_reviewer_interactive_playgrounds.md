---
title: Docs Phase 31–32: DocPolicy as Code, AI‑lite Reviewer & Interactive Playgrounds
summary: Turn governance into code (OPA + JSON Schema), add a rule‑based reviewer bot, ship interactive code playgrounds, and expand safety checks for PII/licensing.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Governance as code**: Enforce front‑matter, taxonomy, visibility, and legal via machine‑checked policy.
- **Review assist**: A rule‑based bot that posts actionable checklists on PRs.
- **Delight**: Interactive code playgrounds (JS/TS) embedded in MDX for copy‑paste‑free learning.
- **Safety**: Stronger PII/secret detection and media licensing attestation.

---

# Track A — DocPolicy as Code (JSON Schema + OPA)

## A1) Front‑matter JSON Schema

**`docs/_meta/frontmatter.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Docs Frontmatter",
  "type": "object",
  "additionalProperties": true,
  "required": ["title", "summary", "owner", "version"],
  "properties": {
    "title": { "type": "string", "minLength": 3 },
    "summary": { "type": "string", "minLength": 10 },
    "owner": { "type": "string" },
    "version": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "visibility": {
      "type": "string",
      "enum": ["public", "partner", "internal"]
    },
    "index": { "type": "boolean" },
    "canonical": { "type": "string", "format": "uri" }
  }
}
```

**`scripts/docs/validate-frontmatter-schema.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const schema = JSON.parse(
  fs.readFileSync('docs/_meta/frontmatter.schema.json', 'utf8'),
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const fm = matter.read(p).data || {};
      if (!validate(fm)) {
        console.error(p, ajv.errorsText(validate.errors));
        fail = 1;
      }
    }
  }
})('docs');
process.exit(fail);
```

**CI (append to docs-quality)**

```yaml
- name: Validate front‑matter schema
  run: |
    npm i ajv ajv-formats gray-matter
    node scripts/docs/validate-frontmatter-schema.js
```

## A2) OPA / Conftest Policy (enforce repo rules)

**`policy/docs.rego`**

```rego
package docs

# Fail pages lacking required sections
violation[msg] {
  input.path.endswith(".md")
  not input.content_matches_see_also
  msg := sprintf("%s missing 'See also' section", [input.path])
}

# Public pages must have index!=false (i.e., indexable)
violation[msg] {
  input.frontmatter.visibility == "public"
  input.frontmatter.index == false
  msg := sprintf("%s is public but marked noindex", [input.path])
}

# Partner/internal pages must have owner != 'unknown'
violation[msg] {
  input.frontmatter.visibility != "public"
  input.frontmatter.owner == "unknown"
  msg := sprintf("%s lacks owner", [input.path])
}
```

**`scripts/docs/conftest-input.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const out = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const g = matter.read(p);
      out.push({
        path: p,
        frontmatter: g.data || {},
        content_matches_see_also: /##\s*See also/i.test(g.content),
      });
    }
  }
})('docs');
fs.writeFileSync('conftest.json', JSON.stringify(out, null, 2));
```

**`.github/workflows/docs-policy.yml`**

```yaml
name: Docs Policy Gate
on: [pull_request]
jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          npm i gray-matter
          node scripts/docs/conftest-input.js
      - uses: open-policy-agent/conftest-action@v0.56.0
        with:
          files: conftest.json
          policy: policy
```

**Acceptance**

- CI fails when pages violate schema or OPA policy; errors are actionable.

---

# Track B — AI‑lite Reviewer (Rule‑based PR comments)

**`scripts/docs/reviewer.js`**

```js
const fs = require('fs');
const { execSync } = require('child_process');
const changed = execSync(
  `git diff --name-only origin/${process.env.GITHUB_BASE_REF || 'main'}...`,
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
const tips = [];
if (changed.some((f) => f.startsWith('docs/how-to/')))
  tips.push(
    '- Ensure **Prerequisites**, **Steps**, **Validation**, **Troubleshooting** present.',
  );
if (changed.some((f) => /\.(png|jpg|jpeg|svg)$/i.test(f)))
  tips.push('- Add **alt text** and update **ATTRIBUTIONS.md** if external.');
if (changed.some((f) => f.includes('releases/')))
  tips.push(
    '- Link release notes from **/releases/index** and update **/reference/deprecations** if needed.',
  );
if (!tips.length) tips.push('- Looks good. Ensure sidebars link is present.');
fs.writeFileSync('review-tips.md', tips.join('\n'));
```

**`.github/workflows/docs-reviewer.yml`**

```yaml
name: Docs Reviewer Bot
on: [pull_request]
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/docs/reviewer.js
      - uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('review-tips.md','utf8');
            await github.rest.issues.createComment({ ...context.repo, issue_number: context.payload.pull_request.number, body })
```

**Acceptance**

- Every docs PR gets a checklist comment tailored to changed paths.

---

# Track C — Interactive Code Playgrounds (Sandpack)

## C1) Component and MDX usage

**`docs-site/package.json`** (add deps)

```json
{
  "dependencies": { "@codesandbox/sandpack-react": "^2" }
}
```

**`src/components/Playground.tsx`**

```tsx
import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
export default function Playground({
  files,
  template = 'vanilla-ts',
}: {
  files: Record<string, string>;
  template?: string;
}) {
  return (
    <Sandpack
      template={template}
      files={files}
      options={{ editorHeight: 420, showTabs: true }}
    />
  );
}
```

**Usage in MDX**

```mdx
import Playground from '@site/src/components/Playground';

<Playground
  files={{
    '/index.ts': `import './styles.css';\nconst el = document.getElementById('app')!;\nel.textContent = 'Hello IntelGraph';`,
    '/styles.css': `#app{font-family:sans-serif;padding:1rem}`,
    '/index.html': `<div id="app"></div>`,
  }}
/>
```

**Acceptance**

- Playground renders and runs client‑side; no external calls; pa11y remains green.

---

# Track D — Safety: PII/Secrets & Media Licensing

## D1) High‑entropy and token pattern scan in docs

**`scripts/docs/secret-pii-scan.js`**

```js
const fs = require('fs');
const path = require('path');
const rxToken = /(sk_live|AKIA|AIza|ghp_|xox[baprs]-)[0-9A-Za-z\-\_]+/g;
function entropy(s) {
  const p = [...new Set(s)]
    .map((c) => s.split(c).length - 1)
    .map((f) => f / s.length);
  return -p.reduce((a, b) => a + b * Math.log2(b), 0);
}
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(mdx?|json|yaml|yml)$/i.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(rxToken)) {
        console.error(`Possible token in ${p}: ${m[0].slice(0, 6)}…`);
        fail = 1;
      }
      const chunks = src.split(/\s+/).filter((w) => w.length > 24);
      if (chunks.some((w) => entropy(w) > 4.0)) {
        console.error(`High-entropy strings in ${p}`);
      }
    }
  }
})('docs');
process.exit(fail);
```

**CI** add step (after existing secret scans):

```yaml
- name: Secret/PII scan (entropy + patterns)
  run: node scripts/docs/secret-pii-scan.js
```

## D2) Media licensing attestation

**`docs/_meta/media.csv`**

```
file,source,license,attribution
images/arch.svg,internal,CC-BY-4.0,IntelGraph Docs Team
```

**`scripts/docs/check-media-licensing.js`**

```js
const fs = require('fs');
const path = require('path');
const index = new Map(
  fs
    .readFileSync('docs/_meta/media.csv', 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [file, source, license, attr] = l.split(',');
      return [file.trim(), { source, license, attr }];
    }),
);
let fail = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(png|jpe?g|gif|svg)$/i.test(f)) {
      const rel = p.replace(/^docs\//, '');
      if (!index.has(rel)) {
        console.error('Missing media license entry:', rel);
        fail = 1;
      }
    }
  }
})('docs');
process.exit(fail);
```

**CI** add step:

```yaml
- name: Media licensing check
  run: node scripts/docs/check-media-licensing.js
```

**Acceptance**

- Secret pattern + entropy scan runs; media files require attribution rows.

---

# Execution Plan (3–4 days)

1. Add **front‑matter schema** + **OPA** policy gate and wire into CI.
2. Enable the **reviewer bot** for docs PRs.
3. Ship the **Playground** component and add one interactive example in a tutorial.
4. Turn on **PII/secret** and **media licensing** checks.

---

# Acceptance Criteria

- CI blocks on schema/policy violations with clear errors.
- Reviewer bot posts checklists on docs PRs.
- At least one page includes a working code playground.
- Secret/PII and media licensing checks pass; missing entries fail CI.
