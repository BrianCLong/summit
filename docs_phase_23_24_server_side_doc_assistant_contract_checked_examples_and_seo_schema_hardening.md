---
title: Docs Phase 23–24: Server‑Side Doc Assistant, Contract‑Checked Examples, and SEO/Schema Hardening
summary: Ship a production Doc Assistant with server‑side retrieval & citations, validate examples against schemas/contracts, and harden SEO with structured data and canonicalization.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Answers with citations**: Server‑side RAG over versioned docs with strict source attribution.
- **Correctness**: Automatically validate JSON/YAML examples in docs against OpenAPI/JSON Schema.
- **Discoverability**: Add JSON‑LD (Article/Breadcrumb), canonical URLs, and per‑page metadata.
- **Credibility**: Visible badges for doc freshness and verification status.

---

# Track A — Server‑Side Doc Assistant (RAG, citations, versions)

## A1) Build a static search corpus at build time
**`scripts/assistant/build-corpus.js`**
```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const removeMd = s => s
  .replace(/```[\s\S]*?```/g,'')
  .replace(/<[^>]+>/g,'');
const docsDir = 'docs';
const out = [];
(function walk(d){
  for (const f of fs.readdirSync(d)){
    const p = path.join(d, f); const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)){
      const raw = fs.readFileSync(p,'utf8');
      const g = matter(raw);
      out.push({
        id: p.replace(/^docs\//,''),
        title: g.data.title || path.basename(p),
        summary: g.data.summary || '',
        version: g.data.version || 'latest',
        owner: g.data.owner || 'unknown',
        tags: g.data.tags || [],
        body: removeMd(g.content)
      });
    }
  }
})(docsDir);
fs.mkdirSync('docs/ops/assistant', { recursive: true });
fs.writeFileSync('docs/ops/assistant/corpus.json', JSON.stringify(out, null, 2));
console.log('Corpus size', out.length);
```

Add to **docs build** workflow so corpus ships with the site.

## A2) Embedding indexer (pluggable)
**`scripts/assistant/embed-corpus.js`** (pseudocode; plug in provider as needed)
```js
// Pseudocode – integrate with your embeddings provider.
const fs = require('fs');
const corpus = JSON.parse(fs.readFileSync('docs/ops/assistant/corpus.json','utf8'));
// const embed = async (text)=> provider.embed(text)
(async ()=>{
  const out = [];
  for (const r of corpus){
    // const vec = await embed(r.title + '\n' + r.summary + '\n' + r.body.slice(0, 4000))
    const vec = Array(768).fill(0); // placeholder
    out.push({ id: r.id, version: r.version, vector: vec });
  }
  fs.writeFileSync('docs/ops/assistant/index.json', JSON.stringify(out));
})();
```

## A3) Minimal server (Edge/Node) for retrieval + citations
**`assistant/server.js`**
```js
// Minimal retrieval: cosine-similarity against index.json, return top-k snippets + source ids.
const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('docs/ops/assistant/index.json','utf8'));
const corpus = Object.fromEntries(JSON.parse(fs.readFileSync('docs/ops/assistant/corpus.json','utf8')).map(x=>[x.id, x]));
function dot(a,b){ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s }
function norm(a){ return Math.sqrt(dot(a,a)) }
exports.retrieve = function(queryVec, k=5){
  const scored = idx.map(r=>({ id:r.id, score: dot(queryVec, r.vector)/(norm(queryVec)*norm(r.vector)||1)}));
  return scored.sort((a,b)=>b.score-a.score).slice(0,k).map(s=>({ ...s, doc: corpus[s.id] }));
};
```

> Hook your LLM call to **only** answer from the retrieved documents; render citations as links to versioned pages.

## A4) UI: Assistant page with strict source display
**`docs/assistant/index.mdx`**
```mdx
---
title: Doc Assistant (Server)
summary: Ask questions; answers include citations to specific docs.
owner: docs
---

> Answers are grounded in the docs shown below. If you see an error, open a feedback issue.
```

**Acceptance**
- `corpus.json` and `index.json` generated; server exposes a retrieval endpoint; Assistant page present.

---

# Track B — Contract‑Checked Examples

## B1) Annotate JSON examples with schema pointers
In docs, mark blocks like:
```json test schema=api/intelgraph-core-api.yaml#/components/schemas/Job
{ "id":"abc","status":"RUNNING" }
```

## B2) Validator script (AJV + OpenAPI schema)
**`scripts/docs/validate-examples.js`**
```js
const fs = require('fs');
const path = require('path');
const {default: $RefParser} = require('@apidevtools/json-schema-ref-parser');
const Ajv = require('ajv').default;

async function main(){
  const specPath = 'api/intelgraph-core-api.yaml';
  const spec = await $RefParser.dereference(specPath);
  const schemas = spec.components?.schemas || {};
  const files = [];
  (function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&files.push(p);} })('docs');
  const rx = /```json\s+test\s+schema=([^\s\n]+)[\s\n]([\s\S]*?)```/g;
  const ajv = new Ajv({allErrors:true, strict:false});
  let fail = 0;
  for(const f of files){
    const src = fs.readFileSync(f,'utf8');
    for(const m of src.matchAll(rx)){
      const ref = m[1];
      const json = JSON.parse(m[2]);
      const key = ref.split('#/components/schemas/')[1];
      const schema = schemas[key];
      if (!schema){ console.error('Unknown schema', ref, 'in', f); fail++; continue; }
      const ok = ajv.validate(schema, json);
      if (!ok){ console.error('Schema validation failed in', f, ajv.errorsText()); fail++; }
    }
  }
  process.exit(fail?1:0);
}
main();
```

**CI**: Add to `docs-quality.yml`:
```yaml
      - name: Validate JSON examples against schema
        run: |
          npm i @apidevtools/json-schema-ref-parser ajv
          node scripts/docs/validate-examples.js
```

## B3) Example round‑trip tests (optional)
- For endpoints with `requestBody` examples, send to Prism mock and assert 2xx.

**Acceptance**
- CI fails when examples drift from spec; optional round‑trip confirms request examples are valid.

---

# Track C — SEO & Schema Hardening

## C1) JSON‑LD: Article & Breadcrumb
**`src/theme/DocItem/Footer/SeoJsonLd.tsx`**
```tsx
import React from 'react';
import {useDoc} from '@docusaurus/theme-common/internal';
export default function SeoJsonLd(){
  const {metadata} = useDoc();
  const ld = {
    '@context':'https://schema.org',
    '@type':'TechArticle',
    headline: metadata.title,
    dateModified: metadata.lastUpdatedAt || new Date().toISOString(),
    author: { '@type':'Organization', name:'IntelGraph' },
    breadcrumb: { '@type':'BreadcrumbList', itemListElement: (metadata?.frontMatter?.slug||'').split('/').map((p,i)=>({
      '@type':'ListItem', position: i+1, name: p, item: `/${(metadata?.frontMatter?.slug||'').split('/').slice(0,i+1).join('/')}`
    }))},
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(ld)}} />
}
```

**`src/theme/DocItem/Footer/index.js`** (include `SeoJsonLd` once per page)

## C2) Canonical URLs & noindex support
- Add `frontMatter: { canonical?: string, index?: boolean }` support and render `<link rel="canonical">` and `<meta name="robots" content="noindex">` when set.

## C3) Open Graph/Twitter cards
- Default OG image with page title; override via front‑matter.

**Acceptance**
- Pages emit JSON‑LD; canonical tags present; `index: false` respected; OG previews look clean.

---

# Track D — Freshness & Verification Badges

## D1) “Verified against vX.Y.Z” badge
**`src/components/VerifiedBadge.tsx`**
```tsx
import React from 'react';
export default function VerifiedBadge({ version }:{ version:string }){
  return <span className="badge badge--success">Verified against {version}</span>;
}
```

**Usage**: Inject via MDX for key guides after testing with golden/contract checks.

## D2) Auto‑inject badge post‑CI
- When `docs-versioning.yml` runs on tag `v*`, add/update a small badge include in pages touched by that release.

**Acceptance**
- Key pages display a current verification badge tied to the latest release.

---

# Execution Plan (5 days)
1. Build **corpus + index** artifacts and land Assistant server skeleton.
2. Add **example validator** and annotate 3–5 pages with `json test schema=…`.
3. Wire **JSON‑LD + canonical** injection and test on 3 critical pages.
4. Add **VerifiedBadge** and mark the v24 upgrade guide + ZIP Export how‑to.

---

# Acceptance Criteria
- Assistant corpus/index generated; retrieval API returns top‑k with doc IDs.
- CI fails on invalid JSON examples; round‑trip test optional but documented.
- Pages emit JSON‑LD and canonical tags; `index:false` prevents indexing.
- Verified badges appear on at least two high‑traffic guides.

