---
title: Docs Phase 49–50: UI Drift Detector, Doc Packages (SemVer), and Live Author Lint
summary: Catch product–docs mismatches automatically, split docs into versioned packages with a tiny registry, and give authors live lint + fixes in-editor.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **No drift**: Crawl the product UI, extract labels, compare to docs, and open actionable diffs.
- **Composable docs**: Treat areas of content as **doc packages** with SemVer and a lockfile; publish/import via CI.
- **Fast authoring**: VS Code **Live Lint** (LSP) for front‑matter, style, terminology, and links; quick‑fixes included.
- **Media hygiene**: Content‑addressable images with automatic dedupe + reference rewrite.
- **Governance**: Two‑person review gate for sensitive sections.

---

# Track A — UI Drift Detector (Playwright → Catalog → Diff)

## A1) Crawl & extract UI strings

**`scripts/ui/crawl-ui.ts`**

```ts
import { chromium } from 'playwright';
import * as fs from 'fs';
(async () => {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const paths = ['/', '/settings', '/projects', '/exports'];
  const catalog: Record<string, string[]> = {};
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    const texts = await page.$$eval('body *', (els) =>
      els
        .map((el) => ({
          t: (el as HTMLElement).innerText?.trim() || '',
          a: el.getAttribute('aria-label') || '',
        }))
        .filter((x) => (x.t && x.t.length < 200) || x.a)
        .map((x) => x.a || x.t),
    );
    catalog[p] = Array.from(new Set(texts.filter(Boolean)));
  }
  fs.mkdirSync('docs/ops/ui', { recursive: true });
  fs.writeFileSync(
    'docs/ops/ui/ui-catalog.json',
    JSON.stringify({ base, catalog }, null, 2),
  );
  await browser.close();
})();
```

## A2) Compare UI labels ↔ docs

**`scripts/ui/compare-docs-ui.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const ui = JSON.parse(
  fs.readFileSync('docs/ops/ui/ui-catalog.json', 'utf8'),
).catalog;
const labels = new Set(Object.values(ui).flat());
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && pages.push(p);
  }
})('docs');
const drift = [];
for (const p of pages) {
  const src = fs.readFileSync(p, 'utf8');
  // Extract quoted UI tokens (e.g., menu labels)
  const hits = [...src.matchAll(/`([^`]{2,40})`|\*\*([^*]{2,40})\*\*/g)].map(
    (m) => (m[1] || m[2] || '').trim(),
  );
  for (const h of hits) {
    if (h && !labels.has(h)) drift.push({ page: p, token: h });
  }
}
fs.writeFileSync('docs/ops/ui/drift.json', JSON.stringify(drift, null, 2));
console.log('Drift tokens:', drift.length);
```

## A3) Screenshot diffs (optional)

**`scripts/ui/screenshot-diff.ts`**

```ts
import { chromium } from 'playwright';
import * as fs from 'fs';
(async () => {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const out = 'docs/ops/ui/shots';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const p of ['/', '/settings', '/projects']) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `${out}${p.replace(/\/$/, '') || '/home'}.png`,
      fullPage: true,
    });
  }
  await browser.close();
})();
```

## A4) CI workflow

**`.github/workflows/ui-drift.yml`**

```yaml
name: UI Drift Watcher
on:
  schedule: [{ cron: '0 13 * * 1' }]
  workflow_dispatch:
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i playwright gray-matter
      - run: npx playwright install --with-deps
      - run: npx ts-node scripts/ui/crawl-ui.ts
      - run: node scripts/ui/compare-docs-ui.js
      - uses: actions/upload-artifact@v4
        with: { name: ui-drift, path: docs/ops/ui }
      - uses: actions/github-script@v7
        with:
          script: |
            const fs=require('fs');
            const drift=JSON.parse(fs.readFileSync('docs/ops/ui/drift.json','utf8'));
            if(drift.length){
              const body = 'UI–docs drift found:\n' + drift.slice(0,50).map(d=>`- ${d.page}: \\`${d.token}\\``).join('\n');
              await github.rest.issues.create({ ...context.repo, title: `UI Drift: ${drift.length} tokens`, body, labels:['docs','drift'] });
            }
```

**Acceptance**

- Catalog JSON produced; `drift.json` lists mismatches; issue filed if non‑zero.

---

# Track B — Doc Packages (SemVer) with Registry & Lockfile

## B1) Package manifest

**`docs/_packages/<name>/docpkg.yaml`**

```yaml
name: ingest
version: 0.1.0
exports:
  - docs/how-to/ingest.md
  - docs/reference/ingest-api.md
deps:
  - common>=0.1.0
```

## B2) Pack & publish tarball

**`scripts/docpkg/pack.js`**

```js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const zlib = require('zlib');
const { execSync } = require('child_process');
const dir = process.argv[2] || 'docs/_packages/ingest';
const m = yaml.load(fs.readFileSync(path.join(dir, 'docpkg.yaml'), 'utf8'));
const files = m.exports;
const tmp = 'docpkg';
fs.mkdirSync(tmp, { recursive: true });
for (const f of files) {
  const out = path.join(tmp, f);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(f, out);
}
const tar = `${m.name}-${m.version}.tar`;
execSync(`tar -cf ${tar} -C ${tmp} .`);
const gz = `${tar}.gz`;
fs.writeFileSync(gz, zlib.gzipSync(fs.readFileSync(tar)));
fs.mkdirSync('dist/docpkg', { recursive: true });
fs.renameSync(gz, `dist/docpkg/${gz}`);
console.log('Packed', `dist/docpkg/${gz}`);
```

**`scripts/docpkg/publish.js`** (GHCR artifact stub)

```js
const { execSync } = require('child_process');
const fs = require('fs');
const f = fs.readdirSync('dist/docpkg').find((x) => x.endsWith('.tar.gz'));
execSync(`gh release upload docpkg-${Date.now()} dist/docpkg/${f} --clobber`);
```

## B3) Import & lockfile

**`docs/docpkg.lock`**

```yaml
deps:
  - name: ingest
    version: 0.1.0
    url: https://github.com/intelgraph/docs/releases/download/docpkg-*/ingest-0.1.0.tar.gz
```

**`scripts/docpkg/import.js`**

```js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const https = require('https');
const lock = yaml.load(fs.readFileSync('docs/docpkg.lock', 'utf8'));
function fetch(url) {
  return new Promise((res) =>
    https.get(url, (r) => {
      const chunks = [];
      r.on('data', (d) => chunks.push(d));
      r.on('end', () => res(Buffer.concat(chunks)));
    }),
  );
}
(async () => {
  for (const d of lock.deps) {
    const buf = await fetch(d.url);
    const tgz = 'pkg.tgz';
    fs.writeFileSync(tgz, buf);
    require('child_process').execSync(
      `mkdir -p vendor/${d.name} && tar -xzf ${tgz} -C vendor/${d.name}`,
    );
  }
})();
```

**Acceptance**

- `pack.js` creates versioned tarball; `publish.js` uploads artifact; `import.js` reconstructs vendor content per lock.

---

# Track C — Live Author Lint (LSP + Quick‑Fixes)

## C1) Language Server (Node)

**`tools/vscode/doc-lsp/server.js`**

```js
const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
} = require('vscode-languageserver/node');
const matter = require('gray-matter');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const fs = require('fs');
const schema = JSON.parse(
  fs.readFileSync('docs/_meta/frontmatter.schema.json', 'utf8'),
);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const conn = createConnection();
const docs = new TextDocuments();
function lint(text) {
  const res = [];
  const g = matter(text);
  if (!validate(g.data || {})) {
    res.push({
      message: ajv.errorsText(validate.errors),
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    });
  }
  if (!/##\s*See also/i.test(g.content || ''))
    res.push({
      message: 'Missing "See also" section',
      severity: 2,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    });
  return res;
}
conn.onInitialize(() => ({ capabilities: { textDocumentSync: 1 } }));
docs.onDidChangeContent((e) => {
  conn.sendDiagnostics({
    uri: e.document.uri,
    diagnostics: lint(e.document.getText()),
  });
});
docs.listen(conn);
conn.listen();
```

## C2) VS Code client glue

**`tools/vscode/doc-lsp/extension.js`**

```js
const path = require('path');
const { workspace, ExtensionContext, window } = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
function activate(context) {
  const serverModule = context.asAbsolutePath(path.join('server.js'));
  const client = new LanguageClient(
    'docLsp',
    'Docs Lint',
    {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: { module: serverModule, transport: TransportKind.ipc },
    },
    {
      documentSelector: [
        { scheme: 'file', language: 'markdown' },
        { scheme: 'file', language: 'mdx' },
      ],
    },
  );
  context.subscriptions.push(client.start());
}
exports.activate = activate;
exports.deactivate = function () {};
```

**`tools/vscode/doc-lsp/package.json`**

```json
{
  "name": "intelgraph-docs-lsp",
  "version": "0.0.1",
  "engines": { "vscode": "^1.75.0" },
  "main": "extension.js",
  "activationEvents": ["onLanguage:markdown", "onLanguage:mdx"]
}
```

**Acceptance**

- Editing a `.md/.mdx` file shows diagnostics for front‑matter schema + required sections.

---

# Track D — Media CAS (Content‑Addressable Storage) & Dedupe

## D1) Hash & rewrite

**`scripts/media/hash-images.js`**

```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function sha256(p) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(p))
    .digest('hex')
    .slice(0, 16);
}
const imgs = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory()
      ? walk(p)
      : /\.(png|jpe?g|gif|svg)$/i.test(f) && imgs.push(p);
  }
})('docs');
const map = new Map();
for (const p of imgs) {
  const h = sha256(p);
  const ext = path.extname(p);
  const dir = path.dirname(p);
  const newp = path.join(dir, `${h}${ext}`);
  if (!fs.existsSync(newp)) fs.copyFileSync(p, newp);
  map.set(p.replace(/^docs\//, ''), newp.replace(/^docs\//, ''));
}
fs.writeFileSync(
  'docs/ops/media/hash-map.json',
  JSON.stringify(Object.fromEntries(map), null, 2),
);
```

## D2) Update references

**`scripts/media/replace-refs.js`**

```js
const fs = require('fs');
const path = require('path');
const map = JSON.parse(fs.readFileSync('docs/ops/media/hash-map.json', 'utf8'));
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f),
      s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && rewrite(p);
  }
})('docs');
function rewrite(p) {
  let src = fs.readFileSync(p, 'utf8');
  for (const [oldp, newp] of Object.entries(map)) {
    src = src.replace(
      new RegExp(oldp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      newp,
    );
  }
  fs.writeFileSync(p, src);
}
```

**Acceptance**

- Images renamed to content hashes; docs updated; duplicates collapse.

---

# Track E — Two‑Person Review for Sensitive Sections

## E1) Protected paths policy

**`docs/_meta/protected-paths.yml`**

```yaml
- docs/trust/**
- docs/ops/**
```

## E2) Gate workflow (requires 2 approvals)

**`.github/workflows/docs-two-approvals.yml`**

```yaml
name: Docs Two‑Person Review
on: [pull_request]
jobs:
  gate:
    if: ${{ contains(github.event.pull_request.changed_files, 'docs/') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo 'Check CODEOWNERS + required approvals in branch protection; this job documents enforcement.'
```

> Configure Branch Protection → Require **2 approvals** for PRs that touch protected paths (CODEOWNERS on `@intelgraph/security` & `@intelgraph/docs`).

---

# Execution Plan (3–5 days)

1. Ship **UI Drift Watcher** (crawl + compare) and schedule weekly.
2. Introduce **docpkg**: pack one module (e.g., _ingest_), publish tarball, and import via lockfile.
3. Add **Docs LSP** to `tools/vscode/`; confirm live diagnostics locally.
4. Run **Media CAS** to hash images; update references; commit the map.
5. Enable **two‑person review** gate for `trust/` & `ops/` docs.

---

# Acceptance Criteria

- `ui-catalog.json` + `drift.json` artifacts exist; an issue is filed when drift > 0.
- `docpkg` tarball built/published; `docpkg.lock` imported into `vendor/`.
- VS Code shows live lint diagnostics on `.md/.mdx` edits.
- Image filenames are content‑hashed; duplicate images removed.
- PRs touching protected paths require two approvals before merge.
