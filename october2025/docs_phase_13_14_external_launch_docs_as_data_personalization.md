---
title: Docs Phase 13–14: External Launch, Docs‑as‑Data & Personalization
summary: Finalize a public-ready docs program with external launch hardening, structured metadata, content personalization, continuous localization, and reliability runbooks.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Launch externally** with confidence: security, privacy, legal, uptime.
- Treat **docs as data**: export structured metadata for search, analytics, and knowledge graph.
- Add **personalization**: role/edition-aware surfaces and task shortcuts.
- **Localize** continuously and safely.
- **Reliability**: DR, backups, SLO dashboards.

---

# Track A — External Launch Hardening

## A1) Legal, Privacy, and Branding Gate
- Add `docs/ops/publication-checklist.md` covering: trademarks, third‑party attributions, open‑source licenses, screenshots approvals, PII sweep.
- Add CI **disallowed terms** scan (e.g., internal codenames) via Vale:

```ini
# .vale/IntelGraph/Confidential.yml
extends: existence
message: "Remove internal codename or replace before public release."
level: error
tokens:
  - CodenameX
  - InternalOnly
```

## A2) Security Headers & Crawling Controls
- Ensure production site sends: `Content-Security-Policy`, `X-Content-Type-Options=nosniff`, `Referrer-Policy=strict-origin-when-cross-origin`.
- Add `robots.txt` & per‑page `noindex` tag support (front‑matter `index: false`).
- Document in `docs/ops/hosting.md` and validate in CI with a curl step.

## A3) External Launch Checklist (gate)
- Create `docs/ops/launch-checklist.md` with sign‑off owners (Legal, Brand, Security, Docs).
- Workflow `docs-launch-gate.yml` blocks `main` deploy if checklist unchecked.

---

# Track B — Docs‑as‑Data (structured metadata & KG)

## B1) Structured Metadata Export
- Emit `docs/ops/meta/index.json` with fields: `path, title, summary, owner, lastUpdated, tags, links, type`.

```js
// scripts/docs/export-meta.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const out = [];
(function walk(d){
  for (const f of fs.readdirSync(d)){
    const p = path.join(d,f); const s = fs.statSync(p);
    if (s.isDirectory()) walk(p); else if (/\.mdx?$/.test(f)){
      const src = fs.readFileSync(p,'utf8'); const g = matter(src);
      const links = [...src.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]).filter(h=>!h.startsWith('#'));
      out.push({ path: p.replace(/^docs\//,''), ...g.data, links, type: inferType(p) });
    }
  }
})('docs');
function inferType(p){ if(p.includes('/how-to/')) return 'how-to'; if(p.includes('/tutorials/')) return 'tutorial'; if(p.includes('/reference/')) return 'reference'; if(p.includes('/concept')) return 'concept'; return 'doc'; }
fs.mkdirSync('docs/ops/meta',{recursive:true});
fs.writeFileSync('docs/ops/meta/index.json', JSON.stringify(out, null, 2));
```

- Add step to `docs-quality.yml` and upload as artifact.

## B2) Link Graph & Dead‑end Detection
- Build `docs/ops/meta/graph.json` (nodes=pages, edges=links). Fail CI if any **dead‑end** top‑level page lacks `See also`/`Next steps`.

```js
// scripts/docs/graph-check.js
const meta = require('../../docs/ops/meta/index.json');
const byPath = new Map(meta.map(m=>[m.path,m]));
const edges = [];
for (const m of meta) for (const l of (m.links||[])){
  const t = l.replace(/^\.\//,'').replace(/^\//,'');
  if (byPath.has(t) || meta.find(x=>x.path.replace(/\.mdx?$/,'')===t.replace(/^[.\/]+/,''))) edges.push([m.path,t]);
}
const adjacency = new Map(meta.map(m=>[m.path,0]));
edges.forEach(([_,t])=> adjacency.set(t,(adjacency.get(t)||0)+1));
const deadends = meta.filter(m=>m.type!=='reference' && m.type!=='release' && (m.links||[]).length===0);
if (deadends.length){
  console.error('Dead-end pages (no links out):');
  deadends.slice(0,50).forEach(d=>console.error(' -', d.path));
  process.exit(1);
}
```

## B3) Knowledge Graph Export (optional)
- Emit `docs/ops/meta/graph.nt` (RDF) with predicates: `linksTo`, `ownedBy`, `hasTag`.

---

# Track C — Personalization & Editions

## C1) Role/Edition Switcher
- Add a header switcher: **User / Admin / Operator** and **Community / Enterprise**.
- Store choice in localStorage; filter homepage task cards accordingly.

## C2) Conditional Content (MDX shortcodes)

```mdx
import { IfEdition } from '@site/src/components/Edition';

<IfEdition is="enterprise">
This feature is available in Enterprise.
</IfEdition>
```

**`src/components/Edition.tsx`** renders children based on selected edition.

## C3) Task Recents
- Track last 5 visited docs (client‑side) and surface on homepage.

---

# Track D — Continuous Localization (i18n pipeline)

## D1) Extract Translatable Strings
- Ensure MDX excludes code blocks and front‑matter from translation.
- Produce `i18n/en/messages.json` via script.

## D2) Translation Memory & Glossary Enforcement
- Maintain `i18n/glossary.csv`; Vale rule to ensure glossary term usage.

## D3) Pseudo‑locale Build
- Add `zz` pseudo‑locale to catch truncation/overflow issues in UI.

---

# Track E — Reliability: Backups, DR, SLOs

## E1) Static Artifact Backups
- Nightly job pushes `docs-site/build/` to a versioned storage bucket.

## E2) DR Runbook & Chaos Test
- `docs/ops/dr-docs-site.md` with restore steps.
- Quarterly chaos test: disable primary hosting; validate failover.

## E3) SLO Dashboard
- Simple timeseries for: build success %, deploy latency, uptime, page load p95.

---

# Track F — Content Excellence

## F1) Screenshot Freshness Bot
- Mark screenshots with `data-screenshot-id` and `lastUpdated`.
- Script lists screenshots older than 180 days → opens issues.

## F2) Example Data & Safety
- All examples marked synthetic; add lint rule to block real customer names/domains.

## F3) Tutorial Fit-and-Finish
- Add pre-flight checklists; success criteria; time estimates.

---

# Execution Plan (5–7 days)
1. **A1–A3**: Legal/brand/security gate + headers + launch checklist.
2. **B1–B2**: Metadata export + graph check wired to CI.
3. **C1**: Role/edition switcher + homepage personalization.
4. **E2**: DR runbook + scheduled backup job.
5. **F1**: Screenshot freshness check.
6. **D3**: Pseudo‑locale build.

---

# Acceptance Criteria
- Launch checklist exists; CI gate blocks deploys until signed off.
- Security headers validated in CI; `robots.txt` present; `index: false` respected.
- `docs/ops/meta/index.json` and `graph.json` generated; CI fails on dead‑ends.
- Role/edition switcher live; homepage tiles adapt; recents appear.
- Nightly backup artifact created; DR runbook tested once.
- Screenshot freshness report generated; ≥10 outdated screenshots flagged.
- Pseudo‑locale build compiles without overflow.

