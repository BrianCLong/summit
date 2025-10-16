````markdown
# IntelGraph — Next Sprint Plan (v0.8.0)

**Slug:** `sprint-2025-10-27-intelgraph-v0-8`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-10-27 → 2025-11-07 (10 business days)  
**Theme:** **Predictive & Compliant Intelligence** — GNN‑assisted discovery, federated connectors, redaction/export controls, streaming watchlists, and UX polish.

---

## 0) North Stars & DoD

- **Predict, then Prove:** GNN link suggestions rendered with confidence + feature attributions and **never** auto‑merge without review.
- **Federate Safely:** Source‑side filtering, license propagation, and per‑connector throttles.
- **Compliant by Design:** Field‑level redaction in UI/exports; retention windows enforced; export manifests verifiable.
- **Ops Practicable:** p95 predictive query < 1.0s on cached embeddings; streaming alerts under 500ms fan‑out.

**DoD Gate:**

1. Demo shows: federated import → ER → GNN suggestions → analyst approval → case report with redacted export.
2. Watchlist alerts trigger from Neo4j stream → Socket.IO notifications; audit trail recorded.
3. OPA policies extended to field‑level redaction; exports validated by verifier script.
4. SLO dashboards include GNN inference, connector health, and alert fan‑out.

---

## 1) Epics → Objectives

1. **Federated Connectors (FED‑E1)** — REST/CSV/S3 connectors with source filters, throttling, and license carry‑over.
2. **GNN‑Assist (GNN‑E2)** — Node2Vec/GraphSAGE embeddings, similarity search, and link prediction service with explainers.
3. **Redaction & Retention (COM‑E3)** — Field‑level masking in UI, export redaction, data TTL jobs, appealable overrides.
4. **Streaming Watchlists (ALR‑E4)** — Cypher rules → stream triggers → alert fan‑out to clients and webhooks.
5. **UX & Accessibility (UX‑E5)** — Keyboard palette upgrades, annotation shortcuts, empty‑state learning, and contrast checks.
6. **Quality & Docs (QA‑E6)** — Golden datasets for prediction eval, E2E for redaction/export, operator runbooks.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- Redaction masks (blur/obfuscate) togglable per role; export preview with mask diffs.
- GNN suggestions panel: candidate edges with confidence, features, and approve/ignore queue.
- Watchlist sidebar with rule badges and recent alerts; toasts via Socket.IO.
- Keyboard palette: quick mask toggle, approve/ignore, open rule inspector.

### Backend (Node/Express + Apollo + Redis + Neo4j + Python ML svc)

- Connector framework (pull) with schedules, source filters, and license propagation.
- Python **FastAPI** `ml-gnn` service (PyTorch) for embeddings and link prediction; async client in Node.
- Redaction policy engine (OPA) + exporter masking; retention sweeper jobs.
- Alert rules engine with Neo4j triggers (poll/stream) → Redis pub/sub → Socket.IO/webhooks.

### Ops/SRE & Security

- Connector health panels; backpressure metrics; HPA for `ml-gnn`; GPU flag optional.
- Retention TTL jobs dashboard; export verifier CLI; log redaction of sensitive fields.

### QA/Docs

- Prediction eval harness (AUC/PR@k); redaction/export E2E; watchlist latency tests; operator playbooks.

---

## 3) Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ 90 pts

### Federated Connectors (22 pts)

1. Build connector SDK (CSV/HTTP/S3) with throttles & license carry‑over.  
   **AC:** Per‑connector QPS/MB/s; license attached to claims; retries+DLQ. (**L**)
2. Source filters & field mapping UI in Ingest Wizard.  
   **AC:** Regex/date/range filters; preview sample rows; mapping saved; lineage captured. (**M**)
3. Connector health dashboard.  
   **AC:** Success/fail, throughput, last run, error details; alerts on failure. (**M**)

### GNN‑Assist (30 pts)

4. Embedding pipeline (Node2Vec or GraphSAGE) with nightly jobs.  
   **AC:** Embeddings for ≥100k nodes in <20m; metrics exported. (**XL**)
5. Link prediction API with explainers.  
   **AC:** Returns top‑k edges with confidence + feature attributions; PII safe. (**L**)
6. Suggestions UI + approval queue.  
   **AC:** Approve creates CLAIM edges with provenance; ignore suppresses for 30d; audit trail. (**L**)

### Redaction & Retention (20 pts)

7. Field‑level redaction policies (OPA + UI masks).  
   **AC:** Role‑based masks in UI and exports; policy reason displayed; logged. (**L**)
8. Export preview with mask diff and verifier script.  
   **AC:** Verifier validates manifest+mask; tamper detection fails CI gate. (**M**)
9. Retention sweeper jobs.  
   **AC:** TTL per class; soft‑delete + tombstones; audit entries. (**M**)

### Streaming Watchlists (12 pts)

10. Rule editor (Cypher fragments) + alert fan‑out.  
    **AC:** p95 alert fan‑out < 500ms (demo size); webhook retries; suppression window. (**L**)

### UX & QA (6 pts)

11. Keyboard palette & a11y polish.  
    **AC:** All critical actions keyboard‑reachable; contrast AA+. (**M**)
12. Prediction eval harness + dashboards.  
    **AC:** AUC/PR@k and false‑positive rate panels; golden set committed. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Connector SDK (TypeScript)

```ts
// server/src/connectors/sdk.ts
export interface Connector {
  name: string;
  pull: (ctx: Ctx) => AsyncGenerator<Record<string, any>>;
}
export interface Throttle {
  qps: number;
  mbps: number;
}
export interface License {
  id: string;
  terms: string;
}
export interface Ctx {
  throttle: Throttle;
  license: License;
  log: (o: any) => void;
}

export async function* throttled<T>(it: AsyncGenerator<T>, t: Throttle) {
  const interval = 1000 / Math.max(1, t.qps);
  for await (const x of it) {
    yield x;
    await sleep(interval);
  }
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
```
````

### 4.2 CSV Connector Example

```ts
// server/src/connectors/csv.ts
import { parse } from 'csv-parse';
import fs from 'fs';
import { throttled, Connector } from './sdk';

export const CsvConnector: Connector = {
  name: 'csv',
  async *pull(ctx) {
    const parser = fs
      .createReadStream(process.env.CSV_PATH!)
      .pipe(parse({ columns: true }));
    for await (const rec of parser) yield rec;
  },
};
```

### 4.3 ML Service (FastAPI + PyTorch)

```python
# services/ml-gnn/app.py
from fastapi import FastAPI
from pydantic import BaseModel
import torch

app = FastAPI()

class PredictIn(BaseModel):
    edges: list
    params: dict = {}

@app.post('/embed')
async def embed():
    # TODO: load graph, compute/update embeddings
    return {"status":"ok"}

@app.post('/predict')
async def predict(inp: PredictIn):
    # Dummy score; replace w/ trained link predictor
    out = [{"u":u, "v":v, "score":0.73, "features":{"jaccard":0.44}} for u,v in inp.edges]
    return {"candidates": out}
```

### 4.4 Node client for ML service

```ts
// server/src/gnn/client.ts
import axios from 'axios';
export async function predictLinks(edges: [string, string][]) {
  const { data } = await axios.post(process.env.ML_URL + '/predict', { edges });
  return data.candidates;
}
```

### 4.5 Suggestions Resolver

```ts
// server/src/graphql/resolvers/suggest.ts
import { predictLinks } from '../../gnn/client';
export default {
  Query: {
    linkSuggestions: async (
      _: any,
      { nodes, k }: { nodes: string[]; k: number },
      ctx: any,
    ) => {
      // form candidate pairs by neighborhood
      const pairs = await ctx.driver.executeQuery(
        'MATCH (n) WHERE n.id IN $ids WITH collect(n) as ns UNWIND ns as a UNWIND ns as b WITH a,b WHERE id(a)<id(b) RETURN a.id as u,b.id as v LIMIT $lim',
        { ids: nodes, lim: 500 },
      );
      const edges = pairs.records.map(
        (r) => [r.get('u'), r.get('v')] as [string, string],
      );
      const preds = await predictLinks(edges);
      return preds.sort((a, b) => b.score - a.score).slice(0, k);
    },
  },
};
```

### 4.6 Redaction Policy (OPA)

```rego
package intelgraph.redact

mask[field] {
  input.user.role != "om**buds"
  field := input.field
  field in {"biometric","minor.identifier","geo.precise"}
}
```

### 4.7 Redaction in Exporter

```ts
// server/src/provenance/exporter.ts
import { evaluate } from '../policy/opa';
export async function redactAndExport(ctx, rows) {
  const masked = [];
  for (const r of rows) {
    for (const f of Object.keys(r)) {
      const { mask } = await evaluate('intelgraph/redact/mask', {
        user: ctx.user,
        field: f,
      });
      if (mask) r[f] = '•••';
    }
    masked.push(r);
  }
  return writeBundle(masked);
}
```

### 4.8 Watchlist Alerts (Socket.IO + Webhooks)

```ts
// server/src/alerts/engine.ts
import { createClient } from 'redis';
import axios from 'axios';
export async function fanout(io, ruleId, payload) {
  io.to(`rule:${ruleId}`).emit('alert', payload);
  for (const url of await getWebhookUrls(ruleId)) {
    try {
      await axios.post(url, payload, { timeout: 1500 });
    } catch (e) {
      /* retry/backoff */
    }
  }
}
```

### 4.9 jQuery UI masks & approvals

```js
// apps/web/src/features/redact/jquery-masks.js
$(function () {
  $('[data-redact]').each(function () {
    $(this).text('•••').addClass('masked');
  });
  $(document).on('click', '.approve-link', function () {
    const id = $(this).data('id');
    $.ajax({
      url: '/graphql',
      method: 'POST',
      data: JSON.stringify({
        query: `mutation{ approveSuggestion(id:"${id}") }`,
      }),
      contentType: 'application/json',
    });
  });
});
```

### 4.10 k6 — alert latency

```js
import ws from 'k6/ws';
export const options = { vus: 25, duration: '2m' };
export default function () {
  ws.connect('wss://localhost/collab', {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({ type: 'join', room: 'rule:1' }));
    });
  });
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Connector SDK + CSV/HTTP; health dashboard; filters in wizard.
- **D3–D4:** ML service skeleton; embeddings job; Node client; suggestions resolver.
- **D5–D6:** Suggestions UI + approval queue; provenance on accept/ignore.
- **D7:** Redaction policies + exporter masks + verifier CLI.
- **D8:** Watchlist rules + fan‑out; webhook retries.
- **D9–D10:** Perf/SLOs, tests, docs, demo polish.

---

## 6) Risks & Mitigations

- **Model drift/quality** → golden eval sets, A/B against heuristics, human review required, rollback.
- **Connector backpressure** → throttles, DLQ, circuit breakers, pause/resume.
- **Over‑masking** → policy previews, appeal flow, analytics on masked fields.
- **Alert noise** → suppression windows, dedup keys, confidence thresholds.

---

## 7) Metrics

- AUC/PR@k for link predictions; approval rate and time‑to‑decision; connector throughput/error rate; alert latency; redaction hits by field; SLO compliance.

---

## 8) Release Artifacts

- **ADR‑016:** GNN architecture & training cadence.
- **ADR‑017:** Connector SDK & license propagation.
- **RFC‑023:** Redaction/Retention policy design.
- **Runbooks:** Connector on‑call; ML service scaling; Redaction appeals; Alert noise handling.

---

## 9) Definition of Ready

- Story has AC, threat model, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Branching, CI/CD & Labels

- Branches: `feature/connectors`, `feature/gnn-assist`, `feature/redaction`, `feature/watchlists`
- Labels: `area:connectors`, `area:ml`, `area:compliance`, `area:alerts`, `type:feature`, `needs-tests`, `security`, `perf`
- CI: GPU job (optional) for `ml-gnn`; policy tests in CI; export verifier as CI step.

---

## 11) Demo Script (15 min)

1. Add CSV connector with license; filter rows; run import.
2. See GNN suggestions → approve one → provenance shows ML + human decision chain.
3. Enable redaction; export preview shows mask diff; run verifier.
4. Trigger watchlist event; see toast + webhook receiver log; Grafana shows fan‑out latency.

---

## 12) Out‑of‑Scope (backlog)

- Cross‑tenant federation; online learning; anomaly subgraphs; device mobile app; fine‑grained purpose‑binding.

```

```
