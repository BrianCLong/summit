---
title: Docs Phase 37–38: Enterprise Search, SSO/Audit, Trust Center & Data Governance
summary: Level up enterprise readiness with a first‑party search backend (Typesense/OpenSearch), SSO gating + audit logs for partner/internal builds, a public Trust Center, and operational privacy/data‑governance flows.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Findability @ scale**: Own the search index (Typesense/OpenSearch) with synonyms, boosts, and incremental updates.
- **Access**: Gate partner/internal builds with **SSO (OIDC)**; record **audit logs** of access.
- **Trust**: Publish a **Trust Center** (security, compliance, VDP, uptime).
- **Privacy/Governance**: Add data subject request (DSR) intake, scans, and retention policies for docs artifacts.

---

# Track A — Enterprise Search (Typesense or OpenSearch)

> Choose one backend. Below shows **Typesense**; swap in OpenSearch if preferred.

## A1) Build an indexable corpus with headings & weights
**`scripts/search/build-search-corpus.js`**
```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
function extract(md){
  const lines = md.split(/\r?\n/);
  const out = []; let current = { h: 'h1', text: '' };
  for (const line of lines){
    const m = /^(#{1,6})\s+(.*)/.exec(line);
    if (m){ if (current.text) out.push(current); current = { h: 'h'+m[1].length, text: m[2] } }
    else current.text += ' '+line.replace(/`[^`]+`/g,'');
  }
  if (current.text) out.push(current);
  return out;
}
const docs = [];
(function walk(d){ for (const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&docs.push(p);} })('docs');
const rows = docs.map(p=>{
  const raw = fs.readFileSync(p,'utf8');
  const g = matter(raw);
  const slug = p.replace(/^docs\//,'').replace(/\.mdx?$/,'');
  const sections = extract(g.content);
  return {
    id: slug,
    path: '/'+slug,
    title: g.data.title || slug,
    summary: g.data.summary || '',
    version: g.data.version || 'latest',
    tags: g.data.tags || [],
    sections
  }
});
fs.mkdirSync('docs/ops/search', { recursive: true });
fs.writeFileSync('docs/ops/search/corpus.json', JSON.stringify(rows, null, 2));
console.log('Search corpus:', rows.length);
```

## A2) Typesense schema & ingest
**`scripts/search/typesense-ingest.js`**
```js
const fs = require('fs');
const Typesense = require('typesense');
const corpus = JSON.parse(fs.readFileSync('docs/ops/search/corpus.json','utf8'));
const client = new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST, port: process.env.TYPESENSE_PORT||443, protocol: process.env.TYPESENSE_PROTOCOL||'https' }],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5
});
(async()=>{
  const name = process.env.TYPESENSE_COLLECTION || 'intelgraph_docs';
  try { await client.collections(name).retrieve(); } catch {
    await client.collections().create({
      name,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'path', type: 'string', facet: false },
        { name: 'title', type: 'string' },
        { name: 'summary', type: 'string' },
        { name: 'version', type: 'string', facet: true },
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'sections', type: 'string[]' }
      ],
      default_sorting_field: 'title'
    });
  }
  const docs = corpus.map(r=> ({ id: r.id, path: r.path, title: r.title, summary: r.summary, version: r.version, tags: r.tags, sections: r.sections.map(s=>`${s.h}: ${s.text}`) }));
  await client.collections(name).documents().import(docs, { action: 'upsert' });
  console.log('Ingested', docs.length);
})();
```

## A3) Smart Search UI with fallback to DocSearch
**`src/components/SmartSearch.tsx`**
```tsx
import React, { useEffect, useState } from 'react';
export default function SmartSearch(){
  const [q,setQ] = useState('');
  const [hits,setHits] = useState<any[]>([]);
  useEffect(()=>{ let t = setTimeout(async()=>{
    if (q.length<2) return setHits([]);
    try{
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setHits(await res.json());
    }catch{
      setHits([]);
    }
  }, 150); return ()=>clearTimeout(t); },[q]);
  return (
    <div className="smartsearch">
      <input aria-label="Search" placeholder="Search docs…" value={q} onChange={e=>setQ(e.target.value)} />
      {hits.length>0 && (
        <ul className="smartsearch-results">
          {hits.map(h=> <li key={h.path}><a href={h.path}><strong>{h.title}</strong><br/><small>{h.snippet}</small></a></li>)}
        </ul>
      )}
    </div>
  );
}
```

**Edge function** (example) **`api/search.js`**
```js
// Minimal proxy to Typesense multi-search returning title/path/snippet
export default async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  if (!q) return res.status(200).json([]);
  // TODO: call Typesense search; for now, return empty
  return res.status(200).json([]);
}
```

## A4) CI workflow to rebuild + ingest on main
**`.github/workflows/docs-search.yml`**
```yaml
name: Docs Search Index
on:
  push:
    branches: [main]
    paths: ['docs/**']
jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/search/build-search-corpus.js
      - run: |
          npm i typesense gray-matter
          node scripts/search/typesense-ingest.js
        env:
          TYPESENSE_HOST: ${{ secrets.TYPESENSE_HOST }}
          TYPESENSE_API_KEY: ${{ secrets.TYPESENSE_API_KEY }}
```

**Acceptance**: Corpus generates; Typesense collection ingests on `main`; SmartSearch renders; DocSearch still available.

---

# Track B — SSO Gating & Audit Logs (Partner/Internal)

## B1) oauth2‑proxy + NGINX (preview/prod)
**`docs-site/nginx.sso.conf`**
```nginx
server {
  listen 80;
  location / {
    auth_request /oauth2/auth;
    error_page 401 = /oauth2/start;
    proxy_pass http://static-site;
    proxy_set_header X-User $auth_resp_x_user;
    proxy_set_header X-Email $auth_resp_x_email;
    proxy_set_header X-Groups $auth_resp_x_groups;
  }
  location /oauth2/ { proxy_pass http://oauth2-proxy; }
}
```

> Map IdP groups (e.g., `docs:partner`, `docs:internal`) to the earlier **visibility** gate.

## B2) Map groups → role header for edge gate
**`scripts/docs/role-from-groups.js`**
```js
module.exports = function(groups=''){ const g = (groups||'').split(',').map(s=>s.trim()); if (g.includes('docs:internal')) return 'internal'; if (g.includes('docs:partner')) return 'partner'; return 'public'; }
```

**Express adapter** (if using Node edge):
```js
app.use((req,res,next)=>{ req.headers['x-docs-role'] = require('./scripts/docs/role-from-groups')(req.headers['x-groups']); next(); })
```

## B3) Audit log appender
**`scripts/docs/audit-log.js`**
```js
const fs = require('fs');
module.exports = function(record){
  fs.mkdirSync('docs/ops/audit', { recursive: true });
  fs.appendFileSync('docs/ops/audit/access.ndjson', JSON.stringify({ ts: Date.now(), ...record })+'\n');
}
```

**Express snippet**:
```js
app.use((req,res,next)=>{ require('./scripts/docs/audit-log')({ path:req.path, user:req.headers['x-email']||'anon', role:req.headers['x-docs-role']||'public' }); next(); })
```

## B4) Weekly audit rollup
**`.github/workflows/docs-audit-rollup.yml`**
```yaml
name: Docs Audit Rollup
on:
  schedule: [{ cron: '0 4 * * 1' }]
  workflow_dispatch:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node -e "const fs=require('fs');const p='docs/ops/audit/access.ndjson';if(fs.existsSync(p)){const rows=fs.readFileSync(p,'utf8').trim().split(/\n/).map(JSON.parse);const byRole=rows.reduce((a,r)=>{a[r.role]=(a[r.role]||0)+1;return a;},{});fs.writeFileSync('docs/ops/audit/weekly.json', JSON.stringify({count:rows.length, byRole},null,2));}"
      - uses: actions/upload-artifact@v4
        with: { name: docs-audit, path: docs/ops/audit/weekly.json }
```

**Acceptance**: SSO enforced; role header set; access logs aggregated weekly.

---

# Track C — Trust Center & Security.txt

## C1) Trust Center landing
**`docs/trust/index.md`**
```md
---
title: Trust Center
summary: Security, compliance, privacy, and reliability for IntelGraph Docs.
owner: security
---

- **Security**: architecture, hardening, vulnerability reporting
- **Compliance**: SOC2/ISO (status), data handling, vendor list
- **Privacy**: data collected (docs), retention & deletion
- **Reliability**: uptime, incident history
```

## C2) Vulnerability Disclosure Program (VDP)
**`docs/trust/vdp.md`** (with scope, response targets, safe harbor)

## C3) Add **`/.well-known/security.txt`**
**`public/.well-known/security.txt`**
```
Contact: mailto:security@intelgraph.example
Policy: https://docs.intelgraph.example/trust/vdp
Preferred-Languages: en
Hiring: https://intelgraph.example/careers
```

**Acceptance**: Trust Center pages live; `security.txt` served.

---

# Track D — Privacy & Data Governance Ops

## D1) DSR intake (GitHub issue form)
**`.github/ISSUE_TEMPLATE/dsr.yml`**
```yaml
name: Data Subject Request (DSR)
labels: [privacy, dsr]
body:
  - type: input
    id: email
    attributes: { label: Requestor email }
  - type: dropdown
    id: type
    attributes: { label: Request type, options: [Access, Correction, Deletion] }
  - type: textarea
    id: scope
    attributes: { label: Scope (URLs, pages) }
```

## D2) PII sweep (names/emails) in repo artifacts
**`scripts/privacy/pii-scan.js`**
```js
const fs = require('fs');
const path = require('path');
const rxEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const rxName = /\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g; // heuristic
let hits = [];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); s.isDirectory()?walk(p):/\.(mdx?|json|csv)$/i.test(f)&&scan(p);} })('docs');
function scan(p){ const txt = fs.readFileSync(p,'utf8'); const emails = [...txt.matchAll(rxEmail)].map(m=>m[0]); const names = [...txt.matchAll(rxName)].map(m=>m[0]); if (emails.length||names.length) hits.push({ p, emails:[...new Set(emails)], names:[...new Set(names)].slice(0,5) }); }
fs.mkdirSync('docs/ops/privacy',{recursive:true});
fs.writeFileSync('docs/ops/privacy/pii-hits.json', JSON.stringify(hits, null, 2));
console.log('PII hits:', hits.length);
```

**CI** (manual/scheduled):
```yaml
name: Docs PII Sweep
on:
  schedule: [{ cron: '0 9 * * 1' }]
  workflow_dispatch:
jobs:
  pii:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/privacy/pii-scan.js
      - uses: actions/upload-artifact@v4
        with: { name: pii-hits, path: docs/ops/privacy/pii-hits.json }
```

## D3) Retention policy for artifacts
**`docs/ops/data-governance.md`**
```md
---
title: Docs Data Governance
summary: Retention and deletion policies for docs artifacts and telemetry.
owner: privacy
---

- Access logs: 90 days
- Telemetry (TTA): 180 days anonymized
- Audit artifacts (builds): 1 year
- Deletion pipeline: quarterly purge job
```

**Acceptance**: DSR intake exists; PII sweep artifact produced; retention policy documented.

---

# Execution Plan (4–6 days)
1. A1–A4: Build **search corpus** and wire Typesense ingest + CI; add **SmartSearch** component.
2. B1–B4: Configure **SSO** with oauth2‑proxy; inject role header; enable **audit rollup**.
3. C1–C3: Publish **Trust Center** + **security.txt**.
4. D1–D3: Add **DSR intake**, schedule **PII sweep**, and publish **data governance** policy.

---

# Acceptance Criteria
- Typesense index ingests on `main`; SmartSearch returns results (or clean fallback).
- Partner/internal docs require SSO; audit logs roll up weekly with role counts.
- Trust Center live; `/.well-known/security.txt` resolvable.
- DSR template usable; weekly PII report generated; retention policy documented.

