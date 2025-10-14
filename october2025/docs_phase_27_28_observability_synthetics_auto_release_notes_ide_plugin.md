---
title: Docs Phase 27–28: Observability, Synthetics, Auto-Release Notes & IDE Plugin
summary: Instrument docs with OpenTelemetry, add synthetic monitoring + incident comms, auto-generate release notes from diffs, ship a minimal VS Code docs helper, and harden delivery via container + SBOM.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Observe**: First-class telemetry for page views, searches, broken links, and build errors (OpenTelemetry).
- **Assure**: Synthetic checks on critical paths + incident comms playbook.
- **Automate**: Auto-generate release notes/changelogs from docs diffs.
- **Assist**: VS Code extension to scaffold pages and search docs.
- **Harden**: Containerized docs artifact + SBOM for supply-chain visibility.

---

# Track A — OpenTelemetry Instrumentation

## A1) Client OTel bootstrap (page views, DocSearch queries, link errors)
**`docs-site/static/otel-init.js`**
```js
(function(){
  // Minimal OTel web SDK wiring (pseudo; plug your exporter)
  // Avoid PII: hash pathnames; never send query strings.
  function sha1(s){ return s } // stub; replace with real hash if needed
  function post(url, body){ try{ navigator.sendBeacon?.(url, JSON.stringify(body)); }catch(e){} }
  const endpoint = '/telemetry'; // replace with your collector/edge fn
  function send(ev, attrs){ post(endpoint, { ev, t: Date.now(), attrs }); }
  // Page views
  send('page_view', { path: sha1(location.pathname) });
  // DocSearch queries (DocSearch attaches to .DocSearch-Button or input)
  document.addEventListener('input', (e)=>{
    const el = e.target; if (!el || !el.matches) return;
    if (el.matches('input[type="search"], .DocSearch-Input')){
      const q = (el.value||'').trim(); if (q.length>2) send('search', { qlen: q.length });
    }
  });
  // Broken links (client-side navigations that 404)
  window.addEventListener('error', (e)=>{
    if (e && e.target && e.target.tagName==='A'){ send('link_error', { href: e.target.href }); }
  }, true);
})();
```

**`docusaurus.config.js`** (inject script)
```js
scripts: [{ src: '/otel-init.js', async: true }]
```

## A2) Build telemetry (warnings/errors)
**`scripts/docs/collect-build-telemetry.js`**
```js
const fs = require('fs');
const out = { ts: new Date().toISOString(), warnings: 0, errors: 0 };
// Hook your build output parsing here; this is a stub
fs.mkdirSync('docs/ops/telemetry', { recursive: true });
fs.writeFileSync('docs/ops/telemetry/build.json', JSON.stringify(out, null, 2));
```

**CI** (append to build):
```yaml
      - name: Collect build telemetry
        run: node scripts/docs/collect-build-telemetry.js
      - uses: actions/upload-artifact@v4
        with: { name: build-telemetry, path: docs/ops/telemetry/build.json }
```

**Acceptance**
- `otel-init.js` ships; search length + page view events emit to your collector; build telemetry artifact produced.

---

# Track B — Synthetic Monitoring & Incident Comms

## B1) Synthetics via GitHub Actions (curl-based)
**`.github/workflows/docs-synthetics.yml`**
```yaml
name: Docs Synthetics
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Check pages
        run: |
          set -euo pipefail
          urls=(
            "$BASE_URL/"
            "$BASE_URL/reference/"
            "$BASE_URL/how-to/zip-export"
            "$BASE_URL/releases/v24"
          )
          for u in "${urls[@]}"; do
            t0=$(date +%s%3N)
            code=$(curl -s -o /dev/null -w "%{http_code}" "$u")
            t1=$(date +%s%3N)
            echo "$u $code $((t1-t0))ms"
            if [ "$code" -ge 400 ]; then echo "::error ::$u returned $code"; exit 1; fi
          done
        env:
          BASE_URL: ${{ secrets.DOCS_BASE_URL }}
```

## B2) Incident communications playbook
**`docs/ops/incidents.md`** (skeleton)
```md
---
title: Docs Incident Communications
summary: How we declare, communicate, and resolve incidents for docs.
owner: docs
---

## Severities
- SEV1: Widespread outage; pages 4xx/5xx
- SEV2: Search degraded; major broken links

## Channels
- Status page: …
- Slack: #docs-incidents

## Templates
- Initial notice
- 60‑min updates
- Postmortem checklist
```

**Acceptance**
- Synthetics run on a schedule; failing checks create red runs; playbook published.

---

# Track C — Auto-Release Notes & Changelogs (Docs)

## C1) Diff generator between tags/commits
**`scripts/docs/diff-to-release-notes.js`**
```js
const { execSync } = require('child_process');
const fs = require('fs');
const tag = process.env.RELEASE_TAG || 'vNEXT';
const base = process.env.BASE_REF || 'origin/main~1';
const diff = execSync(`git diff --name-status ${base}... -- docs`, { encoding: 'utf8' }).trim().split('\n');
const changes = { added: [], modified: [], removed: [] };
for (const line of diff){
  if (!line) continue; const [t, file] = line.split(/\s+/);
  if (t==='A') changes.added.push(file);
  else if (t==='M') changes.modified.push(file);
  else if (t==='D') changes.removed.push(file);
}
const md = `---\ntitle: Docs Changes — ${tag}\nsummary: Additions, updates, and removals in docs for ${tag}.\nowner: docs\n---\n\n## Added\n${changes.added.map(f=>`- ${f}`).join('\n') || '- None'}\n\n## Updated\n${changes.modified.map(f=>`- ${f}`).join('\n') || '- None'}\n\n## Removed\n${changes.removed.map(f=>`- ${f}`).join('\n') || '- None'}\n`;
fs.mkdirSync('docs/releases', { recursive: true });
fs.writeFileSync(`docs/releases/changes-${tag}.md`, md);
console.log('Wrote docs/releases/changes-'+tag+'.md');
```

**CI** (on tag):
```yaml
      - name: Generate docs release notes
        run: node scripts/docs/diff-to-release-notes.js
```

**Acceptance**
- Tagging a release generates `docs/releases/changes-<tag>.md` with added/updated/removed sections.

---

# Track D — VS Code Extension (Docs Helper)

## D1) Minimal extension to scaffold pages & open search
**`tools/vscode/intelgraph-docs/package.json`**
```json
{
  "name": "intelgraph-docs-helper",
  "displayName": "IntelGraph Docs Helper",
  "publisher": "intelgraph",
  "version": "0.0.1",
  "engines": { "vscode": "+1.75.0" },
  "activationEvents": ["onCommand:intelgraph.docs.new", "onCommand:intelgraph.docs.search"],
  "contributes": {
    "commands": [
      { "command": "intelgraph.docs.new", "title": "Docs: New Page" },
      { "command": "intelgraph.docs.search", "title": "Docs: Search" }
    ]
  },
  "main": "extension.js"
}
```

**`tools/vscode/intelgraph-docs/extension.js`**
```js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
function activate(context){
  context.subscriptions.push(vscode.commands.registerCommand('intelgraph.docs.new', async ()=>{
    const type = await vscode.window.showQuickPick(['how-to','tutorial','concept'], { placeHolder: 'Doc type' });
    const title = await vscode.window.showInputBox({ prompt: 'Page title' });
    if (!type || !title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const tplPath = path.join(vscode.workspace.rootPath, 'docs/_templates', `${type}.md`);
    const tpl = fs.readFileSync(tplPath, 'utf8').replace('<Task-oriented title>', title).replace('<End-to-end tutorial>', title).replace('<Concept name>', title);
    const out = path.join(vscode.workspace.rootPath, 'docs', type==='concept'?'concepts':type, `${slug}.md`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, tpl);
    const doc = await vscode.workspace.openTextDocument(out);
    vscode.window.showTextDocument(doc);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('intelgraph.docs.search', async ()=>{
    vscode.env.openExternal(vscode.Uri.parse('https://docs.intelgraph.example/?q='));
  }));
}
exports.activate = activate;
function deactivate(){}
exports.deactivate = deactivate;
```

**Acceptance**
- Installing the extension exposes “Docs: New Page” and “Docs: Search” commands that work in-repo.

---

# Track E — Containerized Docs + SBOM

## E1) Dockerfile for static site
**`Dockerfile.docs`**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY docs-site ./docs-site
RUN cd docs-site && npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/docs-site/build /usr/share/nginx/html
COPY docs-site/nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1
```

## E2) SBOM generation (Syft) — optional
**`.github/workflows/docs-sbom.yml`**
```yaml
name: Docs SBOM
on: [pull_request]
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build container image
        run: docker build -f Dockerfile.docs -t docs:ci .
      - name: Generate SBOM
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
          syft registry:local/docs:ci -o json > sbom-docs.json || syft docs:ci -o json > sbom-docs.json
      - uses: actions/upload-artifact@v4
        with: { name: docs-sbom, path: sbom-docs.json }
```

**Acceptance**
- Container image builds; basic healthcheck passes; SBOM artifact uploaded in CI.

---

# Execution Plan (4–5 days)
1. Inject `otel-init.js` and wire collector target; ship build telemetry artifact.
2. Enable **synthetics** workflow; publish **incident comms** page.
3. Land **auto-release notes** generator tied to release tags.
4. Scaffold **VS Code extension** folder and add to repo under `tools/vscode/`.
5. Build **Docker image** for docs site; add **SBOM** workflow.

---

# Acceptance Criteria
- Basic telemetry events captured (page_view, search qlen, link_error) without PII.
- Synthetics run on schedule and fail on 4xx/5xx with timings printed.
- Docs releases include an auto-generated “Docs Changes — vX.Y.Z” page.
- VS Code extension can create a new page from templates locally.
- Dockerized docs site builds with a passing healthcheck; SBOM artifact produced.

