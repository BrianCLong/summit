---
title: Docs Phase 17–18: Learning Paths, Reuse Engine & Golden Tests
summary: Create role-based learning paths with quizzes, a reusable content engine (includes/variables/regions), and executable "golden" tests for tutorials—all wired into CI.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Educate**: Role-based learning paths with progress, quizzes, and certification badge.
- **Reuse**: Single-source snippets & callouts with includes/variables backed by CI.
- **Verify**: Execute critical tutorials in CI as **golden tests** to prevent drift.

---

# Track A — Role-based Learning Paths & Quizzes

## A1) Learning Path Data Model

**`docs/learn/paths.yml`**

```yaml
paths:
  - id: user-core
    title: User Essentials
    role: user
    estMinutes: 35
    modules:
      - docs/get-started/quickstart-5-min.md
      - docs/tutorials/first-ingest.md
      - docs/how-to/zip-export.md
  - id: operator-core
    title: Operator Essentials
    role: operator
    estMinutes: 40
    modules:
      - docs/how-to/upgrade-to-v24.md
      - docs/runbooks/prod-readiness-runbook.md
```

## A2) Path Page Generator

**`scripts/docs/gen-learning-paths.js`**

```js
const fs = require('fs');
const yaml = require('js-yaml');
const data = yaml.load(fs.readFileSync('docs/learn/paths.yml', 'utf8'));
for (const p of data.paths) {
  const slug = `docs/learn/${p.id}.mdx`;
  const mdx = `---\ntitle: ${p.title}\nsummary: Role: ${p.role} • ~${p.estMinutes} min\nowner: docs\n---\n\nimport Path from '@site/src/components/LearningPath';\n\n<Path id="${p.id}" modules={${JSON.stringify(p.modules)}} />\n`;
  fs.writeFileSync(slug, mdx);
  console.log('Generated', slug);
}
```

## A3) UI Components

**`src/components/LearningPath.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
export default function LearningPath({
  id,
  modules,
}: {
  id: string;
  modules: string[];
}) {
  const key = `learn:${id}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    setDone(JSON.parse(localStorage.getItem(key) || '[]'));
  }, [id]);
  const toggle = (m: string) => {
    const next = done.includes(m) ? done.filter((x) => x !== m) : [...done, m];
    setDone(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const pct = Math.round((done.length / modules.length) * 100);
  return (
    <div className="card padding--md">
      <p>Progress: {pct}%</p>
      <ul>
        {modules.map((m) => (
          <li key={m} className="margin-vert--sm">
            <input
              type="checkbox"
              checked={done.includes(m)}
              onChange={() => toggle(m)}
              aria-label={`Mark ${m} complete`}
            />{' '}
            <Link to={`/${m.replace(/^docs\//, '').replace(/\.mdx?$/, '')}`}>
              {m
                .split('/')
                .pop()
                ?.replace(/\.mdx?$/, '')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## A4) Quizzes (lightweight MDX)

**`docs/learn/components/Quiz.mdx`**

```mdx
export const q = (id, prompt, options, answer) => ({
  id,
  prompt,
  options,
  answer,
});
export const questions = [
  q(
    'zip-cert',
    'What does certification verify?',
    ['File size', 'Signature & manifest', 'Filename'],
    1,
  ),
];

;
```

**`src/components/Quiz.tsx`**

```tsx
import React, { useState } from 'react';
export default function Quiz({
  items,
}: {
  items: { id: string; prompt: string; options: string[]; answer: number }[];
}) {
  const [score, setScore] = useState<number | null>(null);
  const [sel, setSel] = useState<Record<string, number>>({});
  const submit = () => {
    let s = 0;
    for (const it of items) if (sel[it.id] === it.answer) s++;
    setScore(s);
  };
  return (
    <div>
      {items.map((it) => (
        <fieldset key={it.id} className="margin-vert--md">
          <legend>{it.prompt}</legend>
          {it.options.map((o, i) => (
            <label key={i} className="block">
              <input
                type="radio"
                name={it.id}
                onChange={() => setSel({ ...sel, [it.id]: i })}
              />{' '}
              {o}
            </label>
          ))}
        </fieldset>
      ))}
      <button className="button button--primary" onClick={submit}>
        Submit
      </button>
      {score !== null && (
        <p>
          Score: {score}/{items.length}
        </p>
      )}
    </div>
  );
}
```

**Usage**

```mdx
import Quiz from '@site/src/components/Quiz';
import { questions } from '@site/docs/learn/components/Quiz.mdx';

<Quiz items={questions} />
```

**Acceptance**

- Learning path pages render with client-side progress; quiz renders & scores locally.

---

# Track B — Reuse Engine: Includes, Variables, Regions

## B1) Variables (site-wide tokens)

**`docs/_meta/vars.json`**

```json
{
  "PRODUCT": "IntelGraph",
  "LATEST": "v24",
  "SUPPORT_EMAIL": "support@example.com"
}
```

**`scripts/docs/substitute-vars.js`**

```js
const fs = require('fs');
const path = require('path');
const vars = JSON.parse(fs.readFileSync('docs/_meta/vars.json', 'utf8'));
function subst(s) {
  return s.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const out = subst(src);
      if (out !== src) fs.writeFileSync(p, out);
    }
  }
})('docs');
```

**Usage in MDX**: `Welcome to {{PRODUCT}} ({{LATEST}})`

## B2) Includes (partials)

**`docs/_includes/safe-mode.mdx`**

```mdx
> **Safe mode:** These commands run against a mock server. Replace base URLs for production.
```

**`scripts/docs/include-partials.js`**

```js
const fs = require('fs');
const path = require('path');
const rx = /<!--\s*include:([^\s]+)\s*-->/g;
function include(file) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(rx, (_, p) =>
    fs.readFileSync(path.join('docs/_includes', p), 'utf8'),
  );
  fs.writeFileSync(file, s);
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) include(p);
  }
})('docs');
```

**Usage** in pages:

```md
<!-- include:safe-mode.mdx -->
```

## B3) Code Regions (sync from source)

Add region tags in source, e.g.:

```ts
// #region create-client
const client = new IntelGraphClient({ apiKey: process.env.API_KEY });
// #endregion create-client
```

**`scripts/docs/sync-regions.js`**

```js
const fs = require('fs');
const path = require('path');
function extractRegion(file, name) {
  const s = fs.readFileSync(file, 'utf8');
  const re = new RegExp(
    `// \\#region ${name}[\s\S]*?// \\#endregion ${name}`,
    'm',
  );
  const m = s.match(re);
  if (!m) throw new Error(`Region ${name} not found in ${file}`);
  return m[0].split('\n').slice(1, -1).join('\n');
}
const map = [
  {
    from: 'packages/sdk-js/src/client.ts',
    region: 'create-client',
    to: 'docs/tutorials/first-ingest.md',
    marker: 'REGION:create-client',
  },
];
for (const m of map) {
  const code = extractRegion(m.from, m.region);
  const md = fs
    .readFileSync(m.to, 'utf8')
    .replace(
      new RegExp(`<!-- ${m.marker} -->[\s\S]*?<!-- \/${m.marker} -->`, 'm'),
      `<!-- ${m.marker} -->\n\n\`\`\`ts\n${code}\n\`\`\`\n\n<!-- /${m.marker} -->`,
    );
  fs.writeFileSync(m.to, md);
}
```

**Usage in MDX**:

````md
<!-- REGION:create-client -->

```ts
// replaced by sync-regions.js
```
````

<!-- /REGION:create-client -->

````

**CI wiring** (append steps to docs-quality):
```yaml
      - name: Substitute vars
        run: node scripts/docs/substitute-vars.js
      - name: Include partials
        run: node scripts/docs/include-partials.js
      - name: Sync code regions
        run: node scripts/docs/sync-regions.js
````

**Acceptance**

- Tokens replaced; partials expanded; code blocks pulled from source on CI.

---

# Track C — Golden Tests for Tutorials (Executable)

## C1) Annotation format

Mark runnable blocks with language + attrs:

````md
```bash test exec timeout=120 env=mock
curl "$BASE_URL/health"
```
````

````

## C2) Runner
**`scripts/docs/run-golden.js`**
```js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const files = [];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&files.push(p);} })('docs');
const blockRx = /```bash\s+test\s+exec(?:\s+timeout=(\d+))?(?:\s+env=(\w+))?[\r\n]+([\s\S]*?)```/g;
const BASE_ENV = { BASE_URL: 'http://localhost:4010' };
async function run(cmd, env, timeout){
  return new Promise((res,reject)=>{
    const p = spawn('bash',['-euo','pipefail','-c',cmd],{ env: {...process.env, ...env} });
    let out=''; let err='';
    const to = setTimeout(()=>{ p.kill('SIGKILL'); reject(new Error('timeout')); }, (timeout||120)*1000);
    p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
    p.on('close',code=>{ clearTimeout(to); code===0?res(out):reject(new Error(err||`exit ${code}`)); });
  });
}
(async ()=>{
  let failed = 0;
  for (const f of files){
    const src = fs.readFileSync(f,'utf8');
    for (const m of src.matchAll(blockRx)){
      const timeout = Number(m[1]||'120');
      const env = (m[2]==='mock')? BASE_ENV : {};
      try{ await run(m[3], env, timeout); console.log('PASS', f); }
      catch(e){ console.error('FAIL', f, e.message); failed++; }
    }
  }
  process.exit(failed?1:0);
})();
````

## C3) CI job (uses Prism mock)

**`.github/workflows/docs-golden.yml`**

```yaml
name: Docs Golden Tests
on: [pull_request]
jobs:
  golden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm i -g @stoplight/prism-cli
      - run: prism mock api/intelgraph-core-api.yaml -p 4010 &
      - run: node scripts/docs/run-golden.js
```

**Acceptance**

- CI executes annotated tutorial blocks against mock; failures block merge.

---

# Track D — Author Experience polish

## D1) Pre-commit hook (Husky)

**`package.json`** (root)

```json
{
  "scripts": {
    "prepare": "husky",
    "docs:check": "node scripts/docs/substitute-vars.js && node scripts/docs/include-partials.js && node scripts/docs/sync-regions.js && node scripts/docs/run-snippets.js"
  },
  "devDependencies": { "husky": "^9" }
}
```

**`.husky/pre-commit`**

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
npm run docs:check
```

## D2) Admonition Shortcuts

**`docs/_includes/callouts.mdx`**

```mdx
import Admonition from '@theme/Admonition';

export const Tip = ({ children }) => (
  <Admonition type="tip">{children}</Admonition>
);
export const Warn = ({ children }) => (
  <Admonition type="warning">{children}</Admonition>
);

;
```

**Usage**

```mdx
import { Tip, Warn } from '@site/docs/_includes/callouts.mdx';
<Tip>Use the mock server in CI.</Tip

>
```

---

# Execution Plan (5 days)

1. Generate learning path pages + UI; add at least **User Essentials** path.
2. Wire variables/includes/regions and retrofit 3–5 pages to use them.
3. Annotate 2 key tutorials and enable **golden tests** in CI with Prism.
4. Add Husky pre-commit and callout shortcuts; update CONTRIBUTING with new workflow.

---

# Acceptance Criteria

- Learning path pages live with progress; at least one quiz scored locally.
- Variables/includes working; at least 5 pages using tokens or partials.
- Region sync pulls code from source; CI fails if region missing.
- Golden tests execute 2+ tutorials and block regressions.
- Pre-commit runs docs checks locally; callout shortcuts available.
