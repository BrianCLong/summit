---
title: Docs Phase 19–20: Federated Docs, In‑App Help, and Offline/Air‑gapped Distribution
summary: Unite multiple repos into one docs surface, embed contextual help inside the product, and ship a certified offline bundle with snippet compilation tests and schema-driven refs.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **Federate**: Pull docs from other repos and surface them under a single IA.
- **Contextualize**: In‑app contextual help + deep links + search overlay.
- **Air‑gap**: Produce a signed, verifiable offline docs bundle with a tiny server.
- **Harden**: Compile‑check TS/Python snippets; auto‑generate GraphQL/gRPC refs.
- **Trust**: Supply‑chain scan for the docs site and plugins.

---

# Track A — Federated Multi‑Repo Docs

## A1) Fetch external docs in CI

**`.github/workflows/docs-federation.yml`**

```yaml
name: Docs Federation
on: [workflow_dispatch, pull_request]
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pull external repos (read-only)
        uses: actions/checkout@v4
        with:
          repository: intelgraph/agents
          path: external/agents
      - name: Map external docs
        run: node scripts/docs/build-federation-map.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-federation-map, path: docs/ops/federation-map.json }
```

## A2) Docusaurus: mount external sources

**`docs-site/docusaurus.config.js`** (add extra docs plugins)

```js
plugins: [
  [
    '@docusaurus/plugin-content-docs',
    {
      id: 'agents',
      path: '../external/agents/docs',
      routeBasePath: '/agents',
      sidebarPath: require.resolve('./sidebars.js'),
      editUrl: 'https://github.com/intelgraph/agents/edit/main/docs/',
    },
  ],
];
```

## A3) Federation map & link checks

**`scripts/docs/build-federation-map.js`**

```js
const fs = require('fs');
function list(dir) {
  const out = [];
  const walk = (d) =>
    fs.readdirSync(d).forEach((f) => {
      const p = d + '/' + f;
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.mdx?$/.test(f)) out.push(p.replace(/^external\//, ''));
    });
  walk('external');
  return out;
}
const files = fs.existsSync('external') ? list('external') : [];
fs.mkdirSync('docs/ops', { recursive: true });
fs.writeFileSync(
  'docs/ops/federation-map.json',
  JSON.stringify({ files }, null, 2),
);
console.log('Federated files:', files.length);
```

**Acceptance**

- External pages available under `/agents/...`; map JSON generated; link checks include federated routes.

---

# Track B — In‑App Contextual Help (HelpKit)

## B1) Export lightweight help index

**`scripts/docs/export-help-index.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const rows = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const fm = matter(src).data || {};
      rows.push({
        slug: p.replace(/^docs\//, '').replace(/\.mdx?$/, ''),
        title: fm.title || path.basename(p),
        tags: fm.tags || [],
        summary: fm.summary || '',
      });
    }
  }
})('docs');
fs.mkdirSync('docs/ops/help', { recursive: true });
fs.writeFileSync('docs/ops/help/index.json', JSON.stringify(rows, null, 2));
```

## B2) Embeddable Help overlay for product UI

**`public/helpkit/helpkit.js`**

```js
(function () {
  function qs(q) {
    return document.querySelector(q);
  }
  async function load() {
    const res = await fetch('/docs/ops/help/index.json');
    const data = await res.json();
    const el = document.createElement('div');
    el.id = 'helpkit';
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.innerHTML =
      '<button id="hk-btn">? Help</button><div id="hk-panel" hidden><input id="hk-q" placeholder="Search..."/><ul id="hk-results"></ul></div>';
    document.body.appendChild(el);
    qs('#hk-btn').onclick = () => {
      qs('#hk-panel').hidden = !qs('#hk-panel').hidden;
    };
    qs('#hk-q').oninput = (e) => {
      const q = (e.target.value || '').toLowerCase();
      const out = data
        .filter(
          (x) =>
            x.title.toLowerCase().includes(q) ||
            x.tags.join(' ').toLowerCase().includes(q),
        )
        .slice(0, 8);
      qs('#hk-results').innerHTML = out
        .map((x) => `<li><a href='/${x.slug}'>${x.title}</a></li>`)
        .join('');
    };
  }
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load);
})();
```

**Usage**: In the product app, load `/helpkit/helpkit.js` from the docs host or copy it; provides search + links.

**Acceptance**

- A minimal overlay appears; search narrows to titles/tags; links deep‑link into docs.

---

# Track C — Offline/Air‑gapped Bundle (Signed)

## C1) Build + manifest + zip

**`scripts/docs/build-offline-bundle.js`**

```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

execSync('cd docs-site && npm i && npm run build', { stdio: 'inherit' });
const root = 'docs-site/build';
const manifest = [];
function hash(file) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');
}
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else {
      manifest.push({
        path: p.replace(/^docs-site\/build\//, ''),
        sha256: hash(p),
        bytes: s.size,
      });
    }
  }
})(root);
fs.writeFileSync(
  'offline-manifest.json',
  JSON.stringify(
    { created: new Date().toISOString(), files: manifest },
    null,
    2,
  ),
);
execSync('zip -r offline-docs.zip docs-site/build offline-manifest.json', {
  stdio: 'inherit',
});
console.log('Wrote offline-docs.zip');
```

## C2) Tiny server for air‑gap

**`scripts/docs/offline-server.js`**

```js
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../docs-site/build');
http
  .createServer((req, res) => {
    const fp = path.join(root, req.url === '/' ? 'index.html' : req.url);
    if (!fp.startsWith(root)) return res.writeHead(403).end('Forbidden');
    fs.readFile(fp, (e, b) =>
      e ? res.writeHead(404).end('Not found') : res.end(b),
    );
  })
  .listen(8080, () => console.log('Offline docs at http://localhost:8080'));
```

## C3) Sign & verify (optional)

- Reuse your existing **ZIP Export & Certification** scheme: sign `offline-manifest.json`; verify on install.

**Acceptance**

- `offline-docs.zip` produced with checksum manifest; serves locally with the tiny server.

---

# Track D — Snippet Compilation Tests (TS & Python)

## D1) TypeScript compile check for ` ```ts test compile ` blocks

**`scripts/docs/check-ts-snippets.js`**

````js
const fs = require('fs');
const child = require('child_process');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = d + '/' + f;
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})('docs');
const rx = /```ts\s+test\s+compile[\r\n]+([\s\S]*?)```/g;
let tmp = '';
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(rx)) {
    tmp += m[1] + '\n';
  }
}
fs.writeFileSync('tmp-snippets.ts', tmp);
try {
  child.execSync(
    'npx -y typescript@5 tsc --pretty false --noEmit tmp-snippets.ts',
    { stdio: 'inherit' },
  );
} catch (e) {
  process.exit(1);
}
````

## D2) Python syntax check for ` ```py test compile `

**`scripts/docs/check-py-snippets.py`**

````python
import re, sys, pathlib
blocks = []
for p in pathlib.Path('docs').rglob('*.md*'):
    s = p.read_text(encoding='utf-8')
    blocks += re.findall(r"```py\s+test\s+compile\n([\s\S]*?)```", s)
code = "\n\n".join(blocks)
(tmp:=pathlib.Path('tmp_snippets.py')).write_text(code, encoding='utf-8')
import pyflakes.api, pyflakes.reporter
r = pyflakes.api.check(code, filename='tmp_snippets.py')
sys.exit(0 if r==0 else 1)
````

**CI** (append to `docs-quality.yml`):

```yaml
- name: Compile-check TS snippets
  run: node scripts/docs/check-ts-snippets.js
- name: Compile-check Python snippets
  run: |
    python -m pip install pyflakes
    python scripts/docs/check-py-snippets.py
```

**Acceptance**

- CI fails on invalid TS/Python code blocks annotated for compilation.

---

# Track E — Schema‑Driven Refs: GraphQL & gRPC

## E1) GraphQL → Docs

**`scripts/docs/gen-graphql-docs.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Requires: npx spectaql or graphdoc installed
npx -y spectaql graphql/schema.graphql --target-dir docs/reference/graphql
```

## E2) gRPC/Protobuf → Docs

**`scripts/docs/gen-grpc-docs.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
protoc --doc_out=docs/reference/grpc --doc_opt=markdown,grpc.md -I proto proto/*.proto
```

**CI** (docs-quality):

```yaml
- name: Generate GraphQL docs
  run: bash scripts/docs/gen-graphql-docs.sh || echo 'GraphQL schema not present; skip'
- name: Generate gRPC docs
  run: bash scripts/docs/gen-grpc-docs.sh || echo 'Protos not present; skip'
```

**Acceptance**

- GraphQL/gRPC references render under Reference; CI stubs skip gracefully if schemas absent.

---

# Track F — Supply‑chain & Security

## F1) Dependency scan for docs site

**`.github/workflows/docs-deps-scan.yml`**

```yaml
name: Docs Dependencies Scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd docs-site && npm i && npm audit --audit-level=moderate || true
```

## F2) CSP test (build-time)

Add a curl step in build to confirm CSP/referrer headers from preview environment, or validate static meta tags.

---

# Execution Plan (5–7 days)

1. **A1–A2**: Federation fetch + mount external docs; link checks adjusted.
2. **B1–B2**: Help index export + simple in‑app overlay.
3. **C1–C2**: Offline bundle + tiny server; (C3) optional signing.
4. **D1–D2**: TS/Python snippet compile checks in CI.
5. **E1–E2**: Schema‑driven refs generation stubs.
6. **F1–F2**: Dependency scan + CSP validation.

---

# Acceptance Criteria

- External docs render under unified site; federation map artifact produced.
- Minimal in‑app Help overlay works and deep‑links into docs.
- `offline-docs.zip` with SHA‑256 manifest produced and verified locally.
- CI compile‑checks TS/Python snippets; failures block merges.
- GraphQL/gRPC reference pages generated (or skipped cleanly if absent).
- Docs site dependencies scanned; CSP rule validated.
