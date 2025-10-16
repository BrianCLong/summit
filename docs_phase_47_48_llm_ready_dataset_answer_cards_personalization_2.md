---
title: Docs Phase 47–48: LLM‑Ready Dataset, Answer Cards, Personalization 2.0 & Support Integrations
summary: Export a versioned, RAG‑friendly dataset (DocCards + chunks), ship structured Answer Cards, add audience‑aware Personalization with bandit experiments, deepen support tool integrations, and formalize EOL sunsetting.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives

- **LLM‑ready**: Produce a clean, versioned **DocCards** dataset (JSONL) with stable chunk IDs, anchors, and manifests.
- **Fast answers**: Render structured **Answer Cards** (TL;DR, steps, key facts) above long pages.
- **Personalization 2.0**: Segment by role/plan and run **bandit** experiments for copy/ordering.
- **Support loop**: Tighten **Zendesk/ServiceNow** workflows with macros and linking.
- **Lifecycle**: Formal **EOL/Sunset** mechanics with deindex feeds and redirect plans.

---

# Track A — LLM‑Ready Dataset (DocCards & Chunks)

## A1) DocCards schema (JSON Lines)

**`docs/ops/rag/schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DocCards",
  "type": "object",
  "required": ["id", "slug", "version", "section", "text", "anchors", "hash"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable chunk id: <slug>#c<ordinal>"
    },
    "slug": { "type": "string" },
    "version": { "type": "string" },
    "title": { "type": "string" },
    "section": { "type": "string" },
    "text": { "type": "string" },
    "anchors": { "type": "array", "items": { "type": "string" } },
    "hash": { "type": "string" },
    "tokens": { "type": "integer" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}
```

## A2) Chunker → DocCards exporter

**`scripts/rag/build-doccards.js`**

````js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const crypto = require('crypto');

function mdToPlain(md) {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/`/g, '')) // keep code text
    .replace(/<[^>]+>/g, '')
    .replace(/^>\s?/gm, '') // strip blockquotes
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // links -> text
    .replace(/\!\[[^\]]*\]\([^)]*\)/g, ''); // images
}

function chunkText(text, max = 900) {
  const words = text.split(/\s+/);
  const chunks = [];
  let cur = [];
  let len = 0;
  for (const w of words) {
    cur.push(w);
    len += w.length + 1;
    if (len > max) {
      chunks.push(cur.join(' '));
      cur = [];
      len = 0;
    }
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks.filter((c) => c.trim().length > 0);
}

const outDir = 'docs/ops/rag';
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'doccards.jsonl');
const fp = fs.createWriteStream(outPath);
let count = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.mdx?$/.test(f)) emit(p);
  }
})('docs');

function emit(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const g = matter(raw);
  const slug = p.replace(/^docs\//, '').replace(/\.mdx?$/, '');
  const title = g.data.title || path.basename(p);
  const version = g.data.version || 'latest';
  const tags = g.data.tags || [];
  const plain = mdToPlain(g.content);
  const paragraphs = plain
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  let ordinal = 0;
  for (const para of paragraphs) {
    const chunks = chunkText(para, 900);
    for (const c of chunks) {
      const id = `${slug}#c${ordinal++}`;
      const hash = crypto.createHash('sha256').update(c).digest('hex');
      const rec = {
        id,
        slug,
        version,
        title,
        section: title,
        text: c,
        anchors: [slug],
        hash,
        tokens: Math.ceil(c.length / 4),
        tags,
      };
      fp.write(JSON.stringify(rec) + '\n');
      count++;
    }
  }
}

fp.end(() => {
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ created: new Date().toISOString(), count }, null, 2),
  );
  console.log('DocCards:', count);
});
````

**CI step** (append in docs-quality):

```yaml
- name: Build DocCards dataset
  run: node scripts/rag/build-doccards.js
- uses: actions/upload-artifact@v4
  with: { name: rag-dataset, path: docs/ops/rag }
```

## A3) Delta feed between commits

**`scripts/rag/delta.js`**

```js
const fs = require('fs');
const { execSync } = require('child_process');
const base = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : 'origin/main';
const changed = execSync(`git diff --name-only ${base}... -- docs`, {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);
fs.writeFileSync(
  'docs/ops/rag/delta.json',
  JSON.stringify({ changed }, null, 2),
);
```

**Acceptance**

- `doccards.jsonl` and `manifest.json` generated per PR; `delta.json` lists impacted pages.

---

# Track B — Structured Answer Cards

## B1) AnswerCard component

**`src/components/AnswerCard.tsx`**

```tsx
import React from 'react';
export default function AnswerCard({
  tldr,
  steps,
  facts,
}: {
  tldr: string;
  steps?: string[];
  facts?: string[];
}) {
  return (
    <div className="card padding--md">
      <p>
        <strong>TL;DR</strong> {tldr}
      </p>
      {steps?.length ? (
        <>
          <h4>Steps</h4>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}
      {facts?.length ? (
        <>
          <h4>Key facts</h4>
          <ul>
            {facts.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
```

## B2) Heuristic extractor (no LLM dependency)

**`scripts/rag/extract-answer-cards.js`**

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const pages = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && pages.push(p);
  }
})('docs');
const out = [];
for (const p of pages) {
  const g = matter.read(p);
  const body = g.content;
  const tldr =
    (body.match(/>\s*\*\*TL;DR\:\*\*\s*(.+)/i) || [])[1] ||
    body
      .split(/\n{2,}/)[0]
      .replace(/\n/g, ' ')
      .slice(0, 240);
  const steps = (body.match(/##\s*Steps[\s\S]*?(?:\n##|$)/i) || [''])[0]
    .split(/\n\d+\.\s+/)
    .slice(1)
    .map((s) => s.trim())
    .slice(0, 6);
  const facts = Array.from(body.matchAll(/-\s+\*\*(.+?)\*\*\:?\s+(.+)/g))
    .map((m) => `${m[1]} — ${m[2]}`)
    .slice(0, 6);
  out.push({
    slug: p.replace(/^docs\//, '').replace(/\.mdx?$/, ''),
    tldr,
    steps,
    facts,
  });
}
fs.mkdirSync('docs/ops/answers', { recursive: true });
fs.writeFileSync('docs/ops/answers/cards.json', JSON.stringify(out, null, 2));
console.log('Answer cards:', out.length);
```

**Usage in MDX**

```mdx
import AnswerCard from '@site/src/components/AnswerCard';
import cards from '@site/docs/ops/answers/cards.json';

{ cards.find(c=>c.slug==='how-to/zip-export') && (

<AnswerCard {...cards.find((c) => c.slug === 'how-to/zip-export')} />
)}
```

**Acceptance**

- Answer cards generated for high‑traffic pages and rendered at top.

---

# Track C — Personalization 2.0 (Segments + Bandits)

## C1) Segment model

**`docs/_meta/segments.json`**

```json
{
  "segments": [
    { "id": "user-free", "when": "role=user & plan=free" },
    { "id": "admin-enterprise", "when": "role=admin & plan=enterprise" }
  ]
}
```

**`src/components/Segment.tsx`**

```tsx
import React from 'react';
export function seg() {
  const role = localStorage.getItem('role') || 'user';
  const plan = localStorage.getItem('plan') || 'free';
  return `${role}-${plan}`;
}
export const If = ({ show, children }: { show: string; children: any }) =>
  seg() === show ? children : null;
```

## C2) Bandit experiment (Thompson sampling)

**`scripts/exp/bandit.js`**

```js
const fs = require('fs');
const path = 'docs/ops/experiments/hero.json';
let state = { A: { a: 1, b: 1 }, B: { a: 1, b: 1 } };
if (fs.existsSync(path)) state = JSON.parse(fs.readFileSync(path, 'utf8'));
function choose() {
  const r = Object.entries(state).map(([k, v]) => ({
    k,
    s: sampleBeta(v.a, v.b),
  }));
  return r.sort((a, b) => b.s - a.s)[0].k;
}
function sampleBeta(a, b) {
  const x = gamma(a),
    y = gamma(b);
  return x / (x + y);
}
function gamma(n) {
  const u = Array.from({ length: 12 }, () => Math.random()).reduce(
    (a, b) => a + b,
    0,
  );
  return -Math.log(u - 6);
}
const variant = choose();
fs.mkdirSync('docs/ops/experiments', { recursive: true });
fs.writeFileSync(
  'docs/ops/experiments/choice.json',
  JSON.stringify({ variant, at: Date.now() }, null, 2),
);
```

**Client hook for recording wins** in `tta.js` (reuse success event; include `variant`).

**Acceptance**

- Segment‑conditioned variants render; bandit state recorded server‑side or via artifacts.

---

# Track D — Support Integrations (Zendesk/ServiceNow)

## D1) Macro generator from Answer Cards

**`scripts/support/generate-macros.js`**

```js
const fs = require('fs');
const cards = JSON.parse(
  fs.readFileSync('docs/ops/answers/cards.json', 'utf8'),
);
const macros = cards.slice(0, 50).map((c) => ({
  title: `IntelGraph: ${c.slug}`,
  body: `TL;DR: ${c.tldr}\nSteps:\n${(c.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\nSee: https://docs.intelgraph.example/${c.slug}`,
}));
fs.mkdirSync('docs/ops/support', { recursive: true });
fs.writeFileSync(
  'docs/ops/support/macros.json',
  JSON.stringify(macros, null, 2),
);
```

## D2) Clipboard button

**`src/components/CopyMacro.tsx`**

```tsx
import React from 'react';
export default function CopyMacro({ slug }: { slug: string }) {
  const data = require('@site/docs/ops/support/macros.json');
  const m = data.find((x: any) => x.title.endsWith(slug));
  if (!m) return null;
  return (
    <button
      className="button button--sm"
      onClick={() => navigator.clipboard.writeText(m.body)}
    >
      Copy support macro
    </button>
  );
}
```

**Acceptance**

- `macros.json` generated; support agents can copy tailored responses with one click.

---

# Track E — EOL/Sunsetting & Deindex Feeds

## E1) Sunset registry

**`docs/_meta/sunset.yml`**

```yaml
versions:
  - id: v21
    sunsetOn: 2025-12-31
    replaceWith: v24
  - id: v22
    sunsetOn: 2026-03-31
    replaceWith: v24
```

## E2) Deindex sitemap + banners

**`scripts/sunset/deindex.js`**

```js
const fs = require('fs');
const yaml = require('js-yaml');
const base = 'https://docs.intelgraph.example';
const s = yaml.load(fs.readFileSync('docs/_meta/sunset.yml', 'utf8'));
const urls = [];
for (const v of s.versions) {
  // naive: list common top-level paths per version; adapt to your routing
  urls.push(`${base}/docs/${v.id}/`);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`).join('')}</urlset>`;
fs.mkdirSync('docs-site/static', { recursive: true });
fs.writeFileSync('docs-site/static/sunset-sitemap.xml', xml);
```

**Banner injection rule**: when `version` is in `sunset.yml` and date < `sunsetOn`, prepend an admonition to affected pages.

**Acceptance**

- `sunset-sitemap.xml` exists for search deindex; pages show sunset banner with replacement pointers.

---

# Execution Plan (4–6 days)

1. Generate **DocCards** dataset + delta feed and upload as PR artifact.
2. Produce **Answer Cards** for 3–5 key pages and render at the top.
3. Wire **segments + bandit**; start with hero copy on the Portal page.
4. Export **support macros** and add Copy button to those pages.
5. Publish **sunset registry** and emit **deindex sitemap**; inject banners.

---

# Acceptance Criteria

- `doccards.jsonl` + `manifest.json` produced per PR; `delta.json` lists changed slugs.
- Answer Cards render on high‑traffic guides; no build warnings; a11y passes.
- Personalization shows correct variant per segment; success events include variant.
- `macros.json` generated; Copy button present on selected pages.
- `sunset-sitemap.xml` built; affected pages display a sunset banner with next‑version links.
