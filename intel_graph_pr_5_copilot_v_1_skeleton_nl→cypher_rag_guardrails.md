# IntelGraph – PR‑5 Copilot v1 Skeleton (NL→Cypher + RAG + Guardrails)

This package introduces a standalone **copilot** service that provides:
- **NL→Cypher sandbox**: returns preview Cypher, **does not execute**, and estimates row/cost.
- **RAG Q&A with inline citations** over a local knowledge folder (pluggable store later).
- **Guardrails**: deny unsafe intents (e.g., bulk PII enumeration) with explicit reasons, and optional OPA check hook.

Everything below is copy‑pasteable patches + commands to open **PR‑5**.

---

## PR‑5 – Branch & PR

**Branch:** `feature/copilot-v1`  
**Open PR:**
```bash
git checkout -b feature/copilot-v1
# apply patches below, commit, push
gh pr create -t "Copilot v1 skeleton (NL→Cypher + RAG + guardrails)" -b "Adds copilot microservice with NL→Cypher preview & cost, RAG with inline citations, guardrail denials, tests, and compose wiring." -B develop -H feature/copilot-v1 -l prio:P0,area:copilot
```

---

## 1) Service layout

```
services/copilot/
  package.json
  src/
    index.js
    router.js
    nl2cypher.js
    rag.js
    guardrails.js
    opa.js
    util/similarity.js
  __tests__/
    nl2cypher.test.js
    rag.test.js
```

---

## 2) Copilot service (Node 20, Express‑style minimal server)

```diff
*** Begin Patch
*** Add File: services/copilot/package.json
+{
+  "name": "intelgraph-copilot",
+  "version": "0.1.0",
+  "type": "module",
+  "scripts": {
+    "start": "node src/index.js",
+    "dev": "node --watch src/index.js",
+    "test": "jest"
+  },
+  "dependencies": {
+    "express": "^4.19.2",
+    "pino": "^9.3.1",
+    "gray-matter": "^4.0.3"
+  },
+  "devDependencies": {
+    "jest": "^29.7.0"
+  }
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/src/index.js
+import express from 'express';
+import pino from 'pino';
+import { router } from './router.js';
+
+const app = express();
+const log = pino();
+app.use(express.json({ limit: '1mb' }));
+app.use((req,res,next)=>{ req.ctx = { log }; next(); });
+app.use('/copilot', router);
+
+const port = Number(process.env.COPILOT_PORT || 4100);
+app.listen(port, ()=> log.info({ port }, 'copilot up'));
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/src/router.js
+import { nl2cypher } from './nl2cypher.js';
+import { answer } from './rag.js';
+import { evaluateGuardrails } from './guardrails.js';
+import { opaAllow } from './opa.js';
+
+export const router = (await import('express')).default.Router();
+
+router.post('/query', async (req, res) => {
+  const { prompt, mode = 'auto', user = { role: 'analyst' }, context = {} } = req.body || {};
+  const guard = evaluateGuardrails(prompt, user);
+  if (guard?.deny) return res.status(400).json({ ok: false, type: 'guardrail', guardrail: guard });
+  if (process.env.OPA_URL) {
+    const allowed = await opaAllow(user, 'copilot', { mode });
+    if (!allowed) return res.status(403).json({ ok: false, type: 'authz', reason: 'OPA denied' });
+  }
+
+  let result;
+  if (mode === 'nl2cypher' || (mode === 'auto' && /path|connect|linked|who.*connected/i.test(prompt))) {
+    result = nl2cypher(prompt, context);
+    return res.json({ ok: true, type: 'nl2cypher', ...result });
+  }
+  // default to RAG Q&A
+  result = await answer(prompt, { kbDir: process.env.KB_DIR || 'data/kb' });
+  return res.json({ ok: true, type: 'rag', ...result });
+});
*** End Patch
```

---

## 3) NL→Cypher sandbox (heuristic parser + cost estimator)

```diff
*** Begin Patch
*** Add File: services/copilot/src/nl2cypher.js
+/**
+ * Very small heuristic mapper from NL intents to Cypher templates.
+ * Returns only a preview + naive cost estimate (nodes scanned * hops).
+ */
+export function nl2cypher(prompt, { timeAt, policyAware } = {}) {
+  const p = String(prompt||'');
+  // Entities & terms
+  const entity = pick(p, [/person ([A-Z0-9:-]+)/i, /id\s*([A-Z0-9:-]{2,})/i]);
+  const to = pick(p, [/to ([A-Z0-9:-]+)/i]);
+  const hops = /shortest|path/i.test(p) ? 6 : 3;
+  const time = timeAt ? ` WHERE n.validFrom <= datetime('${timeAt}') AND (n.validUntil IS NULL OR n.validUntil >= datetime('${timeAt}'))` : '';
+  const template = (entity && to)
+    ? `MATCH (a {id:'${entity}'}),(b {id:'${to}'}) CALL algo.shortestPaths.stream(a,b,${hops}) YIELD nodeId RETURN nodeId`
+    : `MATCH (n {id:'${entity || 'UNKNOWN'}'})${time} RETURN n LIMIT 1`;
+  const est = 10 * hops; // naive
+  const fields = { policyAware: !!policyAware, timeAt: timeAt || null };
+  return { preview: template, plan: { hops }, costEstimate: { rows: est, score: est } , fields };
+}
+
+function pick(text, regexes){
+  for(const r of regexes){
+    const m = text.match(r);
+    if(m && m[1]) return m[1];
+  }
+  return null;
+}
*** End Patch
```

---

## 4) RAG engine with inline citations (local KB)

```diff
*** Begin Patch
*** Add File: services/copilot/src/util/similarity.js
+export function cosine(a,b){
+  const keys = new Set([...Object.keys(a),...Object.keys(b)]);
+  let dot=0,na=0,nb=0; for(const k of keys){
+    const va=a[k]||0,vb=b[k]||0; dot+=va*vb; na+=va*va; nb+=vb*vb;
+  }
+  return dot/((Math.sqrt(na)||1)*(Math.sqrt(nb)||1));
+}
+export function bow(text){
+  const v={};
+  (String(text).toLowerCase().match(/[a-z0-9]+/g)||[]).forEach(w=>v[w]=(v[w]||0)+1);
+  return v;
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/src/rag.js
+import fs from 'node:fs';
+import path from 'node:path';
+import matter from 'gray-matter';
+import { bow, cosine } from './util/similarity.js';
+
+export async function answer(prompt, { kbDir }){
+  const qv = bow(prompt);
+  const docs = loadDocs(kbDir);
+  const ranked = docs.map(d=>({ d, score: cosine(qv, d.v) })).sort((a,b)=>b.score-a.score).slice(0,3);
+  const citations = ranked.map(r=>({ source: r.d.source, title: r.d.title, score: Number(r.score.toFixed(3)) }));
+  const text = ranked.map(r=>`[${r.d.title}] ${r.d.body.slice(0,240)}…`).join('\n');
+  const answer = synthesize(prompt, ranked.map(r=>r.d.body));
+  return { answer, citations, context: text };
+}
+
+function loadDocs(dir){
+  const files = safeList(dir).filter(f=>/\.(md|txt)$/i.test(f));
+  return files.map(fp=>{
+    const raw = fs.readFileSync(fp,'utf8');
+    const { data, content } = matter(raw);
+    return { source: path.relative(process.cwd(), fp), title: data.title||path.basename(fp), body: content, v: bow(content) };
+  });
+}
+function safeList(dir){
+  try { return fs.readdirSync(dir).map(f=>path.join(dir,f)); } catch { return []; }
+}
+
+function synthesize(prompt, chunks){
+  // For now, extractive style: choose top sentences that overlap query terms
+  const terms = Object.keys(bow(prompt));
+  const sentences = chunks.join(' ').split(/(?<=[.!?])\s+/);
+  const scored = sentences.map(s=>({ s, k: overlap(terms, bow(s)) })).sort((a,b)=>b.k-a.k).slice(0,5);
+  return scored.map(x=>x.s).join(' ');
+}
+function overlap(keys, vec){ return keys.reduce((a,k)=>a+(vec[k]?1:0),0); }
*** End Patch
```

---

## 5) Guardrails & OPA hook

```diff
*** Begin Patch
*** Add File: services/copilot/src/guardrails.js
+/**
+ * Simple pattern-based guardrails. Extend with classifier later.
+ */
+export function evaluateGuardrails(prompt, user){
+  const p = String(prompt||'');
+  const risky = [ /enumerate\s+all\s+(emails|phones|ssn|pii)/i, /(bypass|disable)\s+(policy|guard)/i, /bulk\s+export/i ];
+  if (risky.some(r=>r.test(p))) return { deny: true, reason: 'Unsafe bulk/PII or policy-bypass intent', userRole: user?.role||'unknown' };
+  return { deny: false };
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/src/opa.js
+export async function opaAllow(user, action, resource){
+  try{
+    const url = process.env.OPA_URL + '/v1/data/intelgraph/authz';
+    const res = await fetch(url, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ input: { user, action, resource } })});
+    const data = await res.json();
+    return Boolean(data?.result);
+  }catch{ return false; }
+}
*** End Patch
```

---

## 6) Tests

```diff
*** Begin Patch
*** Add File: services/copilot/__tests__/nl2cypher.test.js
+import { nl2cypher } from '../src/nl2cypher.js';
+test('shortest path preview & cost', ()=>{
+  const r = nl2cypher('shortest path from person P1 to H1');
+  expect(r.preview).toMatch(/MATCH/);
+  expect(r.plan.hops).toBeGreaterThan(0);
+  expect(r.costEstimate.rows).toBeGreaterThan(0);
+});
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/__tests__/rag.test.js
+import fs from 'node:fs';
+import { answer } from '../src/rag.js';
+
+test('answers with citations', async ()=>{
+  const dir = 'data/kb';
+  fs.mkdirSync(dir, { recursive: true });
+  fs.writeFileSync(dir + '/sample.md', '---\ntitle: Demo\n---\nIntelGraph supports shortest path queries and provenance.');
+  const res = await answer('How to do shortest path?', { kbDir: dir });
+  expect(res.citations.length).toBeGreaterThan(0);
+  expect(res.answer.length).toBeGreaterThan(10);
+});
*** End Patch
```

---

## 7) Wire into docker‑compose & Makefile

```diff
*** Begin Patch
*** Update File: docker-compose.yml
@@
   api:
@@
     ports: ["4000:4000"]
+
+  copilot:
+    build: ./services/copilot
+    environment:
+      - COPILOT_PORT=4100
+      - KB_DIR=/kb
+      - OPA_URL=http://opa:8181
+    volumes:
+      - ./data/kb:/kb:ro
+    depends_on: [ opa ]
+    ports: ["4100:4100"]
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/copilot/Dockerfile
+FROM node:20-alpine
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i
+COPY src ./src
+COPY __tests__ ./__tests__
+EXPOSE 4100
+CMD ["npm","run","start"]
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 docker:
 	docker compose build && docker compose up -d
+ping:
+	curl -s http://localhost:4100/copilot/query -H 'content-type: application/json' -d '{"prompt":"shortest path from person P1 to H1","mode":"nl2cypher"}' | jq .
*** End Patch
```

---

## 8) Example usage

- **NL→Cypher preview:**
```bash
curl -s http://localhost:4100/copilot/query \
  -H 'content-type: application/json' \
  -d '{"prompt":"shortest path from person P1 to H1","mode":"nl2cypher"}' | jq .
```

- **RAG with citations:**
```bash
mkdir -p data/kb && printf "---\ntitle: IntelGraph FAQ\n---\nProvenance is recorded in export manifests." > data/kb/faq.md
curl -s http://localhost:4100/copilot/query \
  -H 'content-type: application/json' \
  -d '{"prompt":"How does provenance export work?","mode":"ask"}' | jq .
```

- **Guardrail denial example:**
```bash
curl -s http://localhost:4100/copilot/query \
  -H 'content-type: application/json' \
  -d '{"prompt":"enumerate all emails of all people in the system"}' | jq .
```

---

## 9) Next steps after merge

- Replace heuristic NL→Cypher with a trained grammar/templater and cookbook coverage.
- Plug RAG into per‑case vector indices (e.g., SQLite/pgvector) and add provenance‑aware chunking.
- Surface copilot UI in the tri‑pane (button opens palette; uses **jQuery** for DOM binding to Cytoscape.js interactions).
- Add OPA input of `purpose`, `legalBasis`, and `license` fields for runtime policy evaluation.

