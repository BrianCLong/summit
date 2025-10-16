# Days 5–7 — Connector Catalog, Synthesis Copilot, Predictive Orchestration & Entity Resolution

> Objective: Ship a **20‑connector allow‑listed catalog** with golden extractors (Day‑5), deliver a **Synthesis Copilot** with consensus/claims and citation‑rich answers (Day‑6), and add **Predictive Orchestration + Entity Resolution** with offline policy evaluation (Day‑7). All features stay within Policy Gate, budgets, and provenance requirements.

---

## Day‑5 — Connector Catalog + Golden Extractors

### 0) Success Criteria

- 20 allow‑listed connectors configured with rate limits, license metadata, and extractor mappings.
- Golden fixtures + unit tests ≥95% extractor precision on sample pages/feeds.
- OAuth‑capable connectors modeled but **disabled** unless license/authority present.
- p95 fetch: HTTP < 3s, Headless < 6s on validated domains.

### 1) Proposed Connector α‑list (validate TOS/robots before enabling)

1. `docs.python.org` — API/library docs
2. `developer.mozilla.org` (MDN) — web specs
3. `chromestatus.com` — web platform changes
4. `nvd.nist.gov` (RSS/API) — CVE/NVD feeds
5. `attack.mitre.org` — ATT&CK techniques
6. `csrc.nist.gov` — standards pages
7. `arxiv.org` — abstracts pages
8. `ietf.org` — RFC HTML
9. `github.com` public issues (no auth) — issue pages
10. `pypi.org` — project pages
11. `npmjs.com` — package pages
12. `go.dev` — module docs
13. `kubernetes.io` — docs pages
14. `grafana.com` — plugin changelogs
15. `prometheus.io` — docs pages
16. `cloud.google.com/docs` — docs pages (respect robots & rate)
17. `docs.aws.amazon.com` — docs pages (respect robots & rate)
18. `azure.microsoft.com` docs — docs pages (respect robots & rate)
19. `blog.chromium.org` — release notes
20. `feeds.feedburner.com/TheHackersNews` — RSS (for pilot news feed parsing)

> Mark 16–18 as **headless=false** initially; enable headless per path if needed and allowed.

### 2) Registry & OAuth schema additions

```sql
-- scripts/migrate_day5.sql
alter table interface_registry add column if not exists auth_type text check (auth_type in ('none','api_key','oauth2')) default 'none';
alter table interface_registry add column if not exists oauth_config jsonb; -- {auth_url, token_url, scopes:[], client_id_ref, secret_ref}
alter table interface_registry add column if not exists path_rules jsonb;  -- [{pattern:"/docs/**", extractor:"article_v2", headless:false}]
```

### 3) Seeder (10–20 connectors)

```json
// scripts/seed_connectors.json (excerpt)
[
  {
    "site": "docs.python.org",
    "license_id": "lic_docs",
    "authority_id": "auth_public",
    "allowed_methods": ["GET"],
    "rate_min_delay_ms": 1000,
    "extractor_templates": { "/3/**": "article_v2" },
    "auth_type": "none",
    "path_rules": [
      { "pattern": "/3/**", "extractor": "article_v2", "headless": false }
    ]
  },
  {
    "site": "developer.mozilla.org",
    "license_id": "lic_docs",
    "authority_id": "auth_public",
    "allowed_methods": ["GET"],
    "rate_min_delay_ms": 1000,
    "extractor_templates": { "/**": "article_v2" },
    "auth_type": "none"
  }
]
```

### 4) Extractors — implementations + tests

#### 4.1 Article v2 (smarter headings/sections)

```python
# services/web-agent/extractors/article_v2.py
from bs4 import BeautifulSoup

def extract_article_v2(html: str, url: str):
    s = BeautifulSoup(html, 'html.parser')
    title = (s.find(['h1','title']) or {}).get_text(strip=True)
    # Capture first two h2 sections
    sections = []
    for h2 in s.select('h2')[:2]:
        content = []
        for sib in h2.next_siblings:
            if getattr(sib, 'name', None) == 'h2': break
            if getattr(sib, 'name', None) in ['p','ul','ol','pre','code']:
                content.append(sib.get_text(' ', strip=True)[:500])
        sections.append({"heading": h2.get_text(strip=True), "text": ' '.join(content)})
    claims = [{"key":"title","value":title or url,"conf":0.9,"sourceUrl":url}]
    for i, sec in enumerate(sections):
        claims.append({"key":f"section_{i}","value":f"{sec['heading']}: {sec['text']}","conf":0.7,"sourceUrl":url})
    return claims
```

#### 4.2 FAQ v1

```python
# services/web-agent/extractors/faq_v1.py
from bs4 import BeautifulSoup

def extract_faq_v1(html: str, url: str):
    s = BeautifulSoup(html, 'html.parser')
    faqs = []
    for q in s.select('h2, h3'):
        ans = []
        for sib in q.next_siblings:
            if getattr(sib,'name',None) in ['h2','h3']: break
            if getattr(sib,'name',None) in ['p','ul','ol']:
                ans.append(sib.get_text(' ', strip=True))
        if ans:
            faqs.append({"key":"faq","value":f"{q.get_text(strip=True)} — {' '.join(ans)[:400]}","conf":0.65,"sourceUrl":url})
    return faqs[:20]
```

#### 4.3 Changelog v1

```python
# services/web-agent/extractors/changelog_v1.py
from bs4 import BeautifulSoup

def extract_changelog_v1(html: str, url: str):
    s = BeautifulSoup(html, 'html.parser')
    items = []
    for li in s.select('li'):  # fallback heuristic
        t = li.get_text(' ', strip=True)
        if any(x in t.lower() for x in ['fix','change','add','breaking','security']):
            items.append({"key":"change","value":t[:300],"conf":0.6,"sourceUrl":url})
    return items[:25]
```

#### 4.4 CVE JSON v1 (JSON extractor)

```python
# services/web-agent/extractors/cve_json_v1.py
import json

def extract_cve_json_v1(text: str, url: str):
    try:
        obj = json.loads(text)
    except Exception:
        return []
    cve = obj.get('cve', obj.get('CVE',''))
    desc = obj.get('descriptions',[{}])[0].get('value') if isinstance(obj.get('descriptions'), list) else obj.get('description')
    score = obj.get('metrics',{}).get('cvssMetricV31',[{}])[0].get('cvssData',{}).get('baseScore')
    claims = []
    if cve: claims.append({"key":"cve","value":str(cve),"conf":0.95,"sourceUrl":url})
    if desc: claims.append({"key":"description","value":desc[:500],"conf":0.8,"sourceUrl":url})
    if score is not None: claims.append({"key":"cvss","value":str(score),"conf":0.9,"sourceUrl":url})
    return claims
```

#### 4.5 Table v2 (key/value tables)

```python
# services/web-agent/extractors/table_v2.py
from bs4 import BeautifulSoup

def extract_table_v2(html: str, url: str):
    s = BeautifulSoup(html, 'html.parser')
    out = []
    for tr in s.select('table tr'):
        tds = [td.get_text(' ', strip=True) for td in tr.find_all(['td','th'])]
        if len(tds) >= 2:
            out.append({"key":tds[0][:64], "value":" | ".join(tds[1:])[:256], "conf":0.7, "sourceUrl":url})
    return out[:50]
```

#### 4.6 Extractor registry

```python
# services/web-agent/extractors/__init__.py (updated)
from .article_v2 import extract_article_v2
from .faq_v1 import extract_faq_v1
from .changelog_v1 import extract_changelog_v1
from .cve_json_v1 import extract_cve_json_v1
from .table_v2 import extract_table_v2

def run_extractor(name: str, payload: str, url: str):
    if name == 'article_v2': return extract_article_v2(payload, url)
    if name == 'faq_v1': return extract_faq_v1(payload, url)
    if name == 'changelog_v1': return extract_changelog_v1(payload, url)
    if name == 'cve_json_v1': return extract_cve_json_v1(payload, url)
    if name == 'table_v2': return extract_table_v2(payload, url)
    # fallback to article_v2
    return extract_article_v2(payload, url)
```

### 5) Golden fixtures & tests

```python
# services/web-agent/tests/test_extractors.py
from extractors import run_extractor

HTML_ARTICLE = """<html><h1>Title</h1><h2>Intro</h2><p>Alpha</p><h2>Usage</h2><p>Bravo</p></html>"""
HTML_FAQ = """<html><h2>What is X?</h2><p>Explanation</p><h2>How use?</h2><p>Steps</p></html>"""
HTML_TABLE = """<table><tr><th>Key</th><th>Val</th></tr><tr><td>A</td><td>B</td></tr></table>"""

def test_article_v2():
    claims = run_extractor('article_v2', HTML_ARTICLE, 'u')
    assert any(c['key']=='section_0' for c in claims)

def test_faq_v1():
    claims = run_extractor('faq_v1', HTML_FAQ, 'u')
    assert len([c for c in claims if c['key']=='faq'])>=2

def test_table_v2():
    claims = run_extractor('table_v2', HTML_TABLE, 'u')
    assert any(c['key']=='Key' and 'Val' in c['value'] for c in claims)
```

### 6) Load & acceptance

- Run smoke across 20 connectors with HTTP only; headless on specific pages if allowed.
- Verify p95 targets and precision on fixtures.

---

## Day‑6 — Synthesis Copilot (RAG) with Trust/Consensus

### 0) Success Criteria

- `orchestratedAnswer(question, contextId)` GraphQL mutation returns: `answer`, `claims`, `citations`, `consensusScore`, `conflicts`.
- Summaries are **evidence‑only** by default (configurable to allow light paraphrase), with inline citations.
- UI shows answer with citation popovers and conflict banner.

### 1) GraphQL API

```ts
// services/web-orchestrator/src/schema.answer.ts
import { gql } from 'apollo-server-express';
export const typeDefsAnswer = gql`
  scalar JSON
  type OrchestratedAnswer {
    id: ID!
    answer: String!
    claims: JSON!
    citations: [Citation!]!
    consensusScore: Float!
    conflicts: JSON!
  }
  type Mutation {
    orchestratedAnswer(question: String!, contextId: ID!): OrchestratedAnswer!
  }
`;
```

### 2) Pipeline (resolver)

```ts
// services/web-orchestrator/src/resolvers.answer.ts
import { v4 as uuid } from 'uuid';
import { domainCandidates } from './db';
import { Bandit } from './bandit';
import { publishFetch } from './publisher';
import { gatherResults } from './resultsConsumer'; // subscribe to web.fetch.completed
import { synthesize } from './synthService'; // calls Python synth via gRPC/HTTP

export const resolversAnswer = {
  Mutation: {
    orchestratedAnswer: async (
      _: any,
      { question, contextId }: any,
      ctx: any,
    ) => {
      const id = 'ans_' + uuid();
      const domains = await domainCandidates('qna');
      const bandit = new Bandit(domains);
      // naive plan: choose 3 domains
      const picks = Array.from(
        new Set([bandit.choose(), bandit.choose(), bandit.choose()]),
      );
      // enqueue jobs for relevant paths derived by a simple router (placeholder)
      for (const d of picks) {
        await publishFetch({
          id: 'wf_' + uuid(),
          target: d,
          path: '/',
          purpose: 'qna',
          authorityId: 'auth_public',
          licenseId: 'lic_docs',
          extractor: 'article_v2',
        });
      }
      const results = await gatherResults({
        contextId,
        max: picks.length,
        timeoutMs: 4000,
      });
      const out = await synthesize({ question, results, contextId });
      return { id, ...out };
    },
  },
};
```

### 3) Synthesizer — trust/consensus + summary (Python)

```python
# services/synthesizer/consensus.py
from collections import defaultdict

def consensus(results, trust: dict[str,float]|None=None):
    trust = trust or {}
    # aggregate by key; weight = claim.conf * source_trust
    agg = defaultdict(lambda: defaultdict(float))
    evidence = defaultdict(list)
    for r in results:
        for c in r.get('claims', []):
            w = float(c.get('conf',0.5)) * float(trust.get(c.get('sourceUrl',''), 1.0))
            agg[c['key']][c['value']] += w
            evidence[(c['key'], c['value'])].append(c.get('sourceUrl'))
    merged = {}
    conflicts = []
    for k, dist in agg.items():
        top = max(dist.items(), key=lambda kv: kv[1])
        merged[k] = { 'value': top[0], 'score': top[1], 'evidence': list(set(evidence[(k, top[0])])) }
        if len(dist) > 1:
            conflicts.append({ 'key': k, 'alts': sorted([(v,s) for v,s in dist.items()], key=lambda x:-x[1]) })
    # global consensus score: normalized average of top mass across keys
    denom = sum(sum(d.values()) for d in agg.values()) or 1.0
    top_mass = sum(v['score'] for v in merged.values())
    return merged, conflicts, top_mass/denom
```

```python
# services/synthesizer/synth_service.py (HTTP server for orchestrator)
from fastapi import FastAPI
from pydantic import BaseModel
from consensus import consensus

app = FastAPI()

class Req(BaseModel):
    question: str
    results: list[dict]
    contextId: str

@app.post('/synthesize')
async def synth(req: Req):
    merged, conflicts, cs = consensus(req.results)
    # evidence‑only answer: stitch key=value lines + citations
    lines = []
    citations = []
    for k, obj in merged.items():
        lines.append(f"{k}: {obj['value']}")
        for src in obj['evidence']:
            citations.append({"url": src, "licenseId": "lic_docs"})
    answer = "\n".join(lines)
    return {"answer": answer, "claims": merged, "citations": citations, "consensusScore": cs, "conflicts": conflicts}
```

### 4) UI — Answer with Citations (preview component)

```tsx
// ui/MaestroAnswerPanel.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';

export default function MaestroAnswerPanel() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    // demo query
    const q = `mutation{ orchestratedAnswer(question:"What changed in latest release?", contextId:"ctx1"){answer, citations{url}, consensusScore, conflicts} }`;
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ query: q }),
    }).done((r) => setData(r.data.orchestratedAnswer));
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-semibold">Synthesized Answer</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{data.answer}</pre>
        <div className="mt-2 text-xs text-gray-600">
          Consensus: {(data.consensusScore * 100).toFixed(1)}%
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold">Citations</h3>
        <ul className="list-disc ml-5">
          {data.citations.map((c: any, i: number) => (
            <li key={i}>
              <a
                className="text-blue-600 underline"
                href={c.url}
                target="_blank"
                rel="noreferrer"
              >
                {c.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {data.conflicts?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-3">
          <b>Conflicts detected:</b> {data.conflicts.length}. See Maestro Panel
          → Conflicts.
        </div>
      )}
    </div>
  );
}
```

### 5) Acceptance

- Evidence‑only summaries pass lint (no unsupported claims); every line maps to at least one citation.
- Consensus score present; conflicts present on seeded contradictory sources.

---

## Day‑7 — Predictive Orchestration + Entity Resolution (ER/GNN)

### 0) Success Criteria

- Contextual bandit improves success‑rate ≥10% over Day‑2 baseline on A/B traffic without cost regression.
- ER pipeline produces `Entity` nodes with links to claims; labeled eval F1 ≥0.90.

### 1) Contextual Thompson Sampling

```ts
// services/web-orchestrator/src/bandit_contextual.ts
export type Ctx = {
  purpose: string;
  hour: number;
  domainClass: string;
  recent: String;
};
export class CtxBandit {
  private arms: Record<string, { a: number; b: number }> = {};
  constructor(public domains: string[]) {
    domains.forEach((d) => (this.arms[d] = { a: 1, b: 1 }));
  }
  score(domain: string, ctx: Ctx) {
    // simple context bias: adjust alpha/beta from historical success per (domainClass,purpose)
    const arm = this.arms[domain];
    const sample = randBeta(arm.a, arm.b);
    const bias = ctx.purpose === 'qna' ? 1.05 : 1.0;
    return sample * bias;
  }
  choose(ctx: Ctx) {
    return this.domains
      .map((d) => [d, this.score(d, ctx)])
      .sort((a, b) => b[1] - a[1])[0][0];
  }
  update(domain: string, success: boolean) {
    const a = this.arms[domain];
    success ? a.a++ : a.b++;
  }
}
function randBeta(a: number, b: number) {
  let x = 0,
    y = 0,
    u = 0;
  do {
    x = Math.random();
    y = Math.random();
    u = Math.pow(x, 1 / a) + Math.pow(y, 1 / b);
  } while (u > 1);
  return x / (x + y);
}
```

### 2) Offline Policy Evaluation (IPS)

```python
# services/analytics/offline_eval.py
import numpy as np

def ips(propensities, rewards, policy_probs):
    # propensities: logged probs under behavior policy; policy_probs: new policy probs for same actions
    w = policy_probs / np.clip(propensities, 1e-6, 1.0)
    return float(np.mean(w * rewards))
```

### 3) Prefetch Hints

- Add `hint_patterns` to registry (e.g., `CVE-\d{4}-\d+` → NVD, MITRE, vendor advisories).
- Orchestrator detects hints in question; enqueues parallel fetches within budget.

```sql
alter table interface_registry add column if not exists hint_patterns text[];
```

### 4) ER Pipeline (blocking → features → GNN)

#### 4.1 Schema additions

```sql
-- scripts/migrate_day7.sql
create table if not exists entities (
  id uuid primary key,
  type text not null,
  canonical_name text,
  created_at timestamptz default now()
);
create table if not exists entity_claim_links (
  entity_id uuid references entities(id),
  claim_manifest_id text not null,
  claim_key text not null,
  claim_value text not null,
  conf numeric,
  primary key(entity_id, claim_manifest_id, claim_key)
);
```

#### 4.2 Feature builder (Python)

```python
# services/er/features.py
import re, numpy as np

def normalize_name(s:str):
    return re.sub(r'[^a-z0-9]+',' ', s.lower()).strip()

def pair_features(a:dict, b:dict):
    # a,b: claim dicts for same key category (e.g., package name, CVE, org)
    na, nb = normalize_name(a['value']), normalize_name(b['value'])
    jacc = jaccard(set(na.split()), set(nb.split()))
    prefix = common_prefix(na, nb)
    return np.array([jacc, len(prefix)/max(len(na),1)])

def jaccard(A,B):
    if not A and not B: return 1.0
    return len(A&B)/max(len(A|B),1)

def common_prefix(a,b):
    i = 0
    while i < min(len(a),len(b)) and a[i]==b[i]: i+=1
    return a[:i]
```

#### 4.3 GNN matcher (PyTorch; simplified MLP on pair features for v1)

```python
# services/er/matcher.py
import torch, torch.nn as nn

class PairNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.mlp = nn.Sequential(nn.Linear(2,16), nn.ReLU(), nn.Linear(16,8), nn.ReLU(), nn.Linear(8,1), nn.Sigmoid())
    def forward(self, x):
        return self.mlp(x)

def train(model, X, y, epochs=20):
    opt = torch.optim.Adam(model.parameters(), 1e-3)
    lossf = nn.BCELoss()
    for _ in range(epochs):
        opt.zero_grad(); pred = model(torch.tensor(X, dtype=torch.float32)).squeeze(1)
        loss = lossf(pred, torch.tensor(y, dtype=torch.float32))
        loss.backward(); opt.step()

def predict(model, X):
    with torch.no_grad():
        return model(torch.tensor(X, dtype=torch.float32)).squeeze(1).numpy()
```

#### 4.4 ER Orchestrator step

```python
# services/er/er_pipeline.py
from features import pair_features
from matcher import PairNet, predict
import uuid

def resolve_entities(claims_by_type: dict[str, list[dict]], threshold=0.9):
    # claims_by_type: { 'package': [claim,...], 'cve':[claim,...] }
    entities = []
    links = []
    for typ, claims in claims_by_type.items():
        # naive blocking: same key only
        if not claims: continue
        # single‑link: choose the highest‑confidence claim as seed
        seed = max(claims, key=lambda c: c.get('conf',0.5))
        ent_id = str(uuid.uuid4())
        entities.append({ 'id': ent_id, 'type': typ, 'canonical_name': seed['value'] })
        for c in claims:
            links.append({ 'entity_id': ent_id, 'manifest_id': c['manifestId'], 'key': c['key'], 'value': c['value'], 'conf': c.get('conf',0.5) })
    return entities, links
```

> Note: For v1 we ship a deterministic high‑precision resolver. The GNN/MLP is prepared for training once labeled pairs exist.

### 5) UI: Entity view & predictive routing telemetry

- Add an **Entities** tab listing newly resolved entities with `canonical_name`, type, and linked evidence count.
- Add a routing telemetry card: win‑rate deltas vs Day‑2 baseline, with IPS estimate.

### 6) Acceptance

- A/B: contextual bandit arm selection improves success ≥10% (jobs resolved with non‑empty claims) at equal or lower cost/latency.
- ER: On labeled set, F1 ≥0.90; manual spot checks show correct linkage and provenance on entity pages.

---

## Deployment & CI/CD

- New migrations: `migrate_day5.sql`, `migrate_day6.sql` (none needed if Day‑6 uses existing tables), `migrate_day7.sql`.
- New services: `synth_service` (FastAPI), `er` (feature+matcher lib; pipeline callable from orchestrator ETL job).
- CI: Jest for GraphQL; Pytest for extractors/synth/ER; k6 smoke for orchestratedAnswer.

## Git workflow

- Branches:
  - `feature/day5-connectors`
  - `feature/day6-synthesis-copilot`
  - `feature/day7-predictive-er`
- Commits (per branch): migrations → services/libs → tests → runbooks → dashboards.

## Day‑5/6/7 Quickstart

1. `psql $DATABASE_URL -f scripts/migrate_day5.sql && psql $DATABASE_URL -f scripts/migrate_day7.sql`
2. Seed connectors: `psql $DATABASE_URL -c "\copy interface_registry FROM 'scripts/seed_connectors.json' with (format json)"` (or write a small import script).
3. Deploy `synth_service` and wire orchestrator `synthServiceURL` env.
4. Mount `MaestroAnswerPanel` under `/answer`.
5. (Optional) Enable contextual bandit and ER cron via feature flags: `CTX_BANDIT=1`, `ER_PIPELINE=1`.

## Revised Maestro Prompt (v6)

> You are the Maestro of IntelGraph’s Web Orchestration. Given a question or purpose, select allow‑listed interfaces via **contextual Thompson Sampling**, enforce **License/TOS/robots** and **budgets**, choose **mode** (`http`/`headless`), fetch and extract structured **claims** (heuristics first; LLM fallback if permitted), compute **consensus** and **conflicts**, and return a citation‑rich answer. Generate **Entities** by linking claims with provenance. Denials must be explainable with an **appeal** path.
