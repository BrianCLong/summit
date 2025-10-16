````markdown
# IntelGraph — Explainable Graph Intelligence Sprint (v1.3.0)

**Slug:** `sprint-2026-01-19-intelgraph-v1-3`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-01-19 → 2026-01-30 (10 business days)  
**Theme:** **Explainability, Anomaly Subgraphs & Safeguards** — counterfactual pathing, GNN explainers, motif anomaly detection, and risk scoring with strong privacy guardrails.

---

## 0) North Stars & DoD

- **Explain Everything:** Each machine‑suggested link/cluster includes human‑readable rationale with **evidence paths**, feature attributions, and confidence bounds.
- **Catch the Weird Stuff:** Detect anomalous subgraphs and temporal spikes; allow analyst labeling to improve detectors.
- **Safety First:** Risk scoring with policy‑aware caps; false‑positive controls; red‑team tests.
- **Ops SLOs:** p95 explainer request < 1.4s (cached), anomaly batch < 90s on 500k edges.

**DoD Gate:**

1. Demo: run link suggestion → open **Explain** → see paths, SHAP‑like features, and counterfactual.
2. Anomaly job flags a suspicious motif; analyst labels it; refreshed scores show impact.
3. Risk score gates exports/search; denials show reasons; appeal path logged.
4. Dashboards show explainer latency, anomaly throughput, FP/TP labels, and error budgets.

---

## 1) Epics → Objectives

1. **Counterfactual & Path Explainers (XAI‑E1)** — k‑path enumerations with constraints; minimal‑change counterfactuals.
2. **GNN Explainability (XAI‑E2)** — Integrated gradients/occlusion on embeddings + SHAP‑style features; UI render.
3. **Anomaly Subgraphs (ANM‑E3)** — Motif/ego‑net outlier detectors; temporal burst detection; label feedback loop.
4. **Risk & Guardrails (RSK‑E4)** — Risk score model with policy caps; export/search gating; red‑team suites.
5. **Ops/QA/Docs (OPS‑E5)** — Caching, SLO dashboards, E2E tests, and analyst guide for explanations.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- **Explain panel** for any ML suggestion: paths, features, counterfactual toggle, copyable citations.
- **Anomaly map** overlay with cluster chips; label UI (true/false positive) and reasons.
- **Risk badges** and policy banners in search/export; jQuery popovers with rationale.

### Backend (Node/Express + Apollo + Neo4j + Python ML svc)

- Path explainer service (bounded k‑path enumeration + scoring).
- GNN explainer endpoints (integrated gradients, occlusion) over embeddings; cache layer.
- Anomaly batch jobs (motifs, degree changes, egonet features) with feedback loop storage.
- Risk engine integrating policy caps + anomaly + model confidence; GraphQL guards.

### Ops/SRE & Security

- Caches for explainers; Prometheus histograms; red‑team scenarios; policy audit.

### QA/Docs

- Golden explainability cases; anomaly evaluation harness; analyst guide; red‑team checklist.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ 90 pts

### Counterfactual & Paths (24 pts)

1. k‑path explainer (Yen/Pruned k‑shortest) with constraints.  
   **AC:** ≤ 20ms per path avg on demo; caps on degree/depth; returns 3–10 paths with scores. (**L**)
2. Counterfactual minimal‑change suggestion.  
   **AC:** Suggests edges to remove/add to flip decision; explains why; budgeted. (**XL**)

### GNN Explainability (22 pts)

3. Integrated gradients over embeddings.  
   **AC:** Top‑k features + contribution scores; cache hit ≥ 80%. (**L**)
4. Feature SHAP surrogate.  
   **AC:** Approx SHAP on tabular features feeding predictor; runtime < 700ms p95 (cached). (**L**)

### Anomaly Subgraphs (28 pts)

5. Motif outlier detection (e.g., triangle scarcity / star hubs).  
   **AC:** Top‑n anomalous egonets stored; provenance; UI overlay. (**L**)
6. Temporal burst detector.  
   **AC:** Alerts when relationship frequency spikes > 3σ; backtests on golden set. (**L**)
7. Label feedback loop.  
   **AC:** Analyst labels persisted; precision improves on next run; dashboard shows FP/TP. (**M**)

### Risk & Guardrails (12 pts)

8. Risk score & gating.  
   **AC:** Risk ∈ [0,1]; caps by license/policy; export/search blocked if risk>θ unless override; audit reasons. (**M**)

### QA/Docs (4 pts)

9. Golden cases, E2E, analyst explainer guide.  
   **AC:** CI gates; docs published. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Path Explainer (Node/TypeScript)

```ts
// server/src/explain/paths.ts
import neo4j from 'neo4j-driver';
export async function kPaths(
  driver: neo4j.Driver,
  a: string,
  b: string,
  k = 5,
  maxLen = 6,
) {
  const cy = `MATCH (a {id:$a}),(b {id:$b})
    CALL gds.shortestPath.yens.stream({
      nodeProjection:'Entity', relationshipProjection:'RELATED', sourceNode:a, targetNode:b, k:$k
    }) YIELD index, path
    WITH index, path, relationships(path) AS rels
    WHERE length(path) <= $maxLen
    RETURN index AS i, [n IN nodes(path) | n.id] AS nodes, reduce(w=0, r IN rels | w + coalesce(r.weight,1)) AS weight
    ORDER BY weight ASC LIMIT $k`;
  const s = driver.session({ defaultAccessMode: 'READ' });
  try {
    return (await s.run(cy, { a, b, k, maxLen })).records.map((r) => ({
      i: r.get('i'),
      nodes: r.get('nodes'),
      weight: r.get('weight'),
    }));
  } finally {
    await s.close();
  }
}
```
````

### 4.2 Counterfactual (edge toggles)

```ts
// server/src/explain/counterfactual.ts
export function minimalEdgeToggle(paths: any[], decision: number) {
  // naive: remove lowest‑contrib edge on top path or add bridge edge between top communities
  const top = paths[0];
  return {
    action: 'remove',
    edge: [top.nodes[1], top.nodes[2]],
    rationale: 'Edge contributes most to weight toward decision',
  };
}
```

### 4.3 Python — Integrated Gradients & SHAP Surrogate

```python
# services/ml-gnn/explain.py
from fastapi import FastAPI
from pydantic import BaseModel
import torch
app = FastAPI()

class EmbIn(BaseModel):
    x: list  # embedding vector

@app.post('/ig')
async def ig(inp: EmbIn):
    x = torch.tensor(inp.x, dtype=torch.float32, requires_grad=True)
    baseline = torch.zeros_like(x)
    steps = 32
    grads = torch.zeros_like(x)
    for a in torch.linspace(0,1,steps):
        y = model(baseline + a*(x-baseline))
        y.sum().backward()
        grads += x.grad; x.grad.zero_()
    attributions = (x - baseline) * grads / steps
    top = torch.topk(attributions.abs(), k=min(10, x.numel()))
    return { 'idx': top.indices.tolist(), 'contrib': top.values.tolist() }
```

### 4.4 Anomaly — Motif Detector (Cypher)

```cypher
// star hub motif (high degree outlier)
MATCH (n:Entity)-[r:RELATED]->()
WITH n, count(r) AS deg
WITH collect(deg) AS ds, collect(n) AS ns
WITH ns, ds, apoc.agg.stats(ds) AS s
UNWIND range(0, size(ns)-1) AS i
WITH ns[i] AS n, ds[i] AS d, s
WHERE d > s.mean + 3*s.stdev
MERGE (n)-[:ANOMALY { kind:'star_hub', score: toFloat(d)/s.mean, at: datetime() }]->(:Analytic)
RETURN n LIMIT 100
```

### 4.5 Temporal Burst Detector (TypeScript)

```ts
// server/src/anomaly/burst.ts
export function sigmaSpike(series: number[]) {
  const n = series.length;
  const mean = series.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return series[n - 1] > mean + 3 * sd;
}
```

### 4.6 Risk Engine (Node)

```ts
// server/src/risk/score.ts
export function riskScore(sample: {
  modelProb: number;
  anomaly: number;
  license: string;
}) {
  const base = 0.6 * sample.modelProb + 0.4 * sample.anomaly;
  const cap =
    sample.license === 'CONSENTED'
      ? 1.0
      : sample.license === 'CC-BY'
        ? 0.9
        : 0.7;
  return Math.min(base, cap);
}
```

### 4.7 GraphQL Guard

```ts
// server/src/graphql/resolvers/guard.ts
import { riskScore } from '../../risk/score';
export function enforceRisk(ctx: any, sample: any) {
  const r = riskScore(sample);
  if (r > (ctx.org?.riskThreshold || 0.85)) throw new Error('HighRiskBlocked');
}
```

### 4.8 jQuery — Explain UI Hooks

```js
// apps/web/src/features/explain/jquery-explain.js
$(function () {
  $(document).on('click', '.btn-explain', function () {
    const id = $(this).data('id');
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        query: `{ explain(id:"${id}"){ paths{ nodes weight } shap{ idx contrib } counterfactual{ action edge rationale } } }`,
      }),
    });
  });
});
```

### 4.9 k6 — Explainer Latency

```js
import http from 'k6/http';
export const options = {
  vus: 40,
  duration: '3m',
  thresholds: { http_req_duration: ['p(95)<1400'] },
};
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({ query: '{ explain(id:"sugg-1"){ paths{nodes } } }' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

### 4.10 Grafana — Key Panels (YAML)

```yaml
panels:
  - title: Explainer p95
    query: histogram_quantile(0.95, sum(rate(explainer_ms_bucket[5m])) by (le))
  - title: Anomaly Jobs Duration
    query: histogram_quantile(0.95, sum(rate(anomaly_job_ms_bucket[5m])) by (le))
  - title: FP/TP Ratio
    query: sum(delta(anomaly_tp_total[1d])) / sum(delta(anomaly_fp_total[1d]))
```

---

## 5) Delivery Timeline

- **D1–D2:** k‑paths & counterfactuals; SHAP surrogate scaffold; UI shell for Explain panel.
- **D3–D4:** Integrated gradients service; caching; anomaly motifs + burst detector.
- **D5–D6:** Label feedback loop; risk engine + GraphQL guard; UI risk badges.
- **D7:** Perf tuning; dashboards; red‑team scenarios.
- **D8–D10:** E2E, docs, analyst guide, demo polish.

---

## 6) Risks & Mitigations

- **Explainer latency** → caching, top‑k truncation, pre‑compute for popular nodes.
- **Anomaly noise** → thresholds, label feedback, suppression windows.
- **Risk over‑blocking** → caps + override path + audits.
- **Privacy leaks in explanations** → policy‑aware redaction in explain payloads.

---

## 7) Metrics

- Explainer p95/p99; cache hit; anomaly precision/recall; FP/TP ratio; blocked actions; export/search denials; SLO compliance.

---

## 8) Release Artifacts

- **ADR‑026:** Path explainer & counterfactual design.
- **ADR‑027:** GNN explainability approach (IG + SHAP surrogate).
- **RFC‑028:** Anomaly subgraph detection & labeling loop.
- **Runbooks:** Explainer cache warm; anomaly tuning; risk override/appeal.
- **Docs:** Analyst “Why did I see this?” guide; Anomaly triage guide.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Pick a suggested link → open **Explain** → walk paths, SHAP features, counterfactual flip.
2. Run anomaly job → highlight star‑hub; label FP/TP; rerun shows improved precision.
3. Attempt high‑risk export/search → see reasoned denial & appeal path; admin adjusts threshold; retry succeeds.
4. Review Grafana panels: explainer p95, anomaly durations, FP/TP trend.

---

## 11) Out‑of‑Scope (backlog)

- Full counterfactual graph editing; semi‑supervised anomaly learning; human‑explanations co‑authoring with LLM; per‑edge purpose constraints.

```

```
