---
title: Docs Phase 35–36: ROI/Deflection, Multi‑Brand Builds, OpenBadges & BI Warehouse
summary: Quantify support deflection & ROI, enable multi‑brand/white‑label builds, award OpenBadges for learning paths, stand up a lightweight BI warehouse for docs signals, and ship click‑based search re‑ranking.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Prove value**: Measure support **deflection** and ROI from docs.
- **Scale brands**: Build **white‑label** variants (partner/internal) from one repo.
- **Motivate learning**: Issue **OpenBadges** for completed paths/quizzes.
- **Analyze**: Consolidate docs signals into a **BI warehouse** (DuckDB/SQLite) with exportable charts.
- **Find faster**: Re‑rank search using click telemetry; generate Algolia query rules.

---

# Track A — Support Deflection & ROI

## A1) “Did this resolve your issue?” event + UTM trail
- Add link param support to capture support context: `?from=support&ticket=<id>`.
- Reuse `tta.js` success signal and store `from` in attrs.

**Patch** `docs-site/static/tta.js` (add source capture)
```js
const params = new URLSearchParams(location.search)
const from = params.get('from')
// ... inside success emit
post('doc_success', { path: location.pathname, tta_ms: t0?Math.round(now()-t0):null, from })
```

## A2) Support export → Deflection report
- Assume a weekly CSV export from your support tool at `support/tickets.csv` with columns: `ticket_id, created, subject, tag, resolved, doc_url (optional)`.

**`scripts/roi/deflection-report.js`**
```js
const fs = require('fs');
const path = require('path');
const parse = s=> s.split(/\r?\n/).slice(1).filter(Boolean).map(l=>{ const [id, created, subject, tag, resolved, doc_url] = l.split(','); return { id, created, subject, tag, resolved: resolved==='true', doc_url } })
const tickets = fs.existsSync('support/tickets.csv') ? parse(fs.readFileSync('support/tickets.csv','utf8')) : []
const tta = (function(){ try{ return JSON.parse(fs.readFileSync('docs/ops/tta/summary.json','utf8')) }catch{ return [] } })()
const last = tta[tta.length-1] || {}
const linked = tickets.filter(t=> t.doc_url)
const deflected = linked.filter(t=> /\b(resolved|answer found)\b/i.test(t.subject) || t.resolved)
const roi = { period: new Date().toISOString().slice(0,10), tickets: tickets.length, linked: linked.length, deflected: deflected.length, tta_p50: last.tta_p50 || null }
fs.mkdirSync('docs/ops/roi',{recursive:true})
fs.writeFileSync('docs/ops/roi/deflection.json', JSON.stringify(roi, null, 2))
console.log('ROI', roi)
```

**Workflow** `.github/workflows/docs-roi.yml`
```yaml
name: Docs ROI/Deflection
on:
  schedule: [{ cron: '0 11 * * 1' }]
  workflow_dispatch:
jobs:
  roi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/roi/deflection-report.js
      - uses: actions/upload-artifact@v4
        with: { name: docs-roi, path: docs/ops/roi/deflection.json }
```

**Acceptance**: Weekly JSON artifact with tickets count, linked docs, deflected count, and latest TTA.

---

# Track B — Multi‑Brand / White‑Label Builds

## B1) Brand tokens
**`brands/base.json`**
```json
{ "name": "IntelGraph", "primary": "#0f766e", "logo": "img/logo.svg" }
```

**`brands/partnerX.json`**
```json
{ "name": "PartnerX", "primary": "#5b21b6", "logo": "img/partnerx-logo.svg" }
```

## B2) Apply brand script
**`scripts/brands/apply-brand.js`**
```js
const fs = require('fs');
const brand = process.env.BRAND || 'base';
const cfg = JSON.parse(fs.readFileSync(`brands/${brand}.json`,'utf8'));
const css = `:root{ --ig-primary:${cfg.primary}; }`;
fs.mkdirSync('docs-site/src/css', { recursive: true });
fs.writeFileSync('docs-site/src/css/brand.css', css);
const dcfg = `module.exports = { themeConfig:{ navbar:{ title: '${cfg.name}' } } }`;
fs.writeFileSync('docs-site/brand.config.js', dcfg);
console.log('Applied brand', brand);
```

**Patch** `docusaurus.config.js` to merge `brand.config.js` if present.

## B3) Build matrix
**`.github/workflows/docs-multibrand.yml`**
```yaml
name: Docs Multi‑brand Build
on: [workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        brand: [base, partnerX]
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/brands/apply-brand.js
        env: { BRAND: ${{ matrix.brand }} }
      - run: cd docs-site && npm i && npm run build
      - uses: actions/upload-artifact@v4
        with: { name: docs-${{ matrix.brand }}, path: docs-site/build }
```

**Acceptance**: Artifacts for `base` and `partnerX` with themed color/logo and navbar title.

---

# Track C — OpenBadges for Learning Paths

## C1) Badge classes
**`docs/learn/badges/badge-classes.json`**
```json
{
  "user-essentials": {
    "id": "https://docs.intelgraph.example/badges/user-essentials",
    "name": "User Essentials",
    "criteria": "Complete the User Essentials path and quiz >= 80%",
    "image": "/img/badges/user-essentials.png",
    "issuer": "https://docs.intelgraph.example/issuer.json"
  }
}
```

## C2) Issuer stub & assertion
**`scripts/learn/issue-badge.js`**
```js
const fs = require('fs');
const cls = JSON.parse(fs.readFileSync('docs/learn/badges/badge-classes.json','utf8'));
const id = process.argv[2] || 'user-essentials'
const email = process.argv[3] || 'user@example.com'
const badge = cls[id]
if(!badge) throw new Error('Unknown badge '+id)
const assertion = {
  '@context': 'https://w3id.org/openbadges/v2',
  'type': 'Assertion',
  'id': `${badge.id}/assertions/${Date.now()}`,
  'recipient': { 'type': 'email', 'identity': email },
  'badge': badge.id,
  'verification': { 'type': 'HostedBadge' },
  'issuedOn': new Date().toISOString()
}
const out = `docs/learn/badges/assertions/${id}-${Date.now()}.json`
fs.mkdirSync('docs/learn/badges/assertions',{recursive:true})
fs.writeFileSync(out, JSON.stringify(assertion, null, 2))
console.log('Wrote', out)
```

**Acceptance**: Badge class JSON exists; script generates hosted assertions (for private or demo use).

---

# Track D — BI Warehouse (DuckDB) & Charts

## D1) Aggregate docs signals into DuckDB
**`scripts/warehouse/load.py`**
```python
import duckdb, json, os, csv
con = duckdb.connect('docs/ops/warehouse/docs.duckdb')
os.makedirs('docs/ops/warehouse', exist_ok=True)

# TTA
try:
    tta = json.load(open('docs/ops/tta/summary.json'))
    con.execute('create or replace table tta as select * from read_json_auto(?)', [json.dumps(tta)])
except Exception: pass

# ROI
try:
    roi = json.load(open('docs/ops/roi/deflection.json'))
    con.execute('create or replace table roi as select * from read_json_auto(?)', [json.dumps([roi])])
except Exception: pass

# A11y/build telemetry (optional)
try:
    bt = json.load(open('docs/ops/telemetry/build.json'))
    con.execute('create or replace table build as select * from read_json_auto(?)', [json.dumps([bt])])
except Exception: pass

con.execute('create or replace view kpis as select tta.date, tta.tta_p50, tta.tta_p90 from tta tta')
con.close()
print('Warehouse updated')
```

## D2) Export CSV for dashboard
**`.github/workflows/docs-warehouse.yml`**
```yaml
name: Docs Warehouse
on:
  schedule: [{ cron: '0 3 * * *' }]
  workflow_dispatch:
jobs:
  wh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install duckdb
      - run: python scripts/warehouse/load.py
      - run: |
          python - <<'PY'
import duckdb
con = duckdb.connect('docs/ops/warehouse/docs.duckdb')
con.execute("copy (select * from kpis) to 'docs/ops/warehouse/kpis.csv' with (header, delimiter ',')")
con.close()
PY
      - uses: actions/upload-artifact@v4
        with: { name: docs-warehouse, path: docs/ops/warehouse }
```

**Acceptance**: DuckDB file and KPI CSV artifact produced on schedule.

---

# Track E — Search Re‑ranking & Query Rules

## E1) Click‑ranker from TTA logs
**`scripts/search/click-rank.js`**
```js
const fs = require('fs');
function safe(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')) }catch{ return [] } }
const tta = safe('docs/ops/tta/summary.json')
// Placeholder: in production, aggregate per query; here, output simple boosts for high‑success pages
const rules = [
  { objectID: 'boost-zip', condition: { context: 'query', pattern: 'zip|cert' }, consequence: { promote: [{ objectID: '/how-to/zip-export', position: 1 }] } },
  { objectID: 'boost-upgrade', condition: { context: 'query', pattern: 'upgrade|v24' }, consequence: { promote: [{ objectID: '/how-to/upgrade-to-v24', position: 1 }] } }
]
fs.mkdirSync('docs/ops/search',{recursive:true})
fs.writeFileSync('docs/ops/search/algolia.rules.json', JSON.stringify(rules, null, 2))
console.log('Wrote rules')
```

## E2) Workflow stub to upload rules (requires keys)
**`.github/workflows/search-rules.yml`**
```yaml
name: Docs Search Rules
on: [workflow_dispatch]
jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo 'Upload docs/ops/search/algolia.rules.json via Algolia API here'
```

**Acceptance**: Rules JSON generated; manual upload or later automation pushes to Algolia.

---

# Execution Plan (4–6 days)
1. **A1–A2**: Wire success source capture + weekly deflection report.
2. **B1–B3**: Apply brand tokens; build `base` and `partnerX` artifacts.
3. **C**: Add OpenBadges class + issuer stub; surface badges on learning pages.
4. **D1–D2**: Stand up DuckDB warehouse and export KPI CSV.
5. **E**: Generate initial click‑based rules JSON.

---

# Acceptance Criteria
- Deflection report artifact published weekly; shows linked & deflected counts.
- Multi‑brand builds produce distinct artifacts with themed colors and logo.
- Badge classes defined; hosted assertions generated for a test user.
- DuckDB warehouse updated on schedule; KPI CSV available as artifact.
- Search rules JSON produced with at least two promotions.

