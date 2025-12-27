# Maestro Conductor v0.9 Sprint Plan

## “Provably Safe Autonomy” — Verify • Learn • Comply

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security/Governance, DX  
**Baseline (from v0.8 targets):** 70 auto‑PRs/wk · LLM $/PR ≤ $0.89 · Eval p95 ≥ 0.90 · TIA −35% test time · OPA/Rego gates on

### Sprint Goal

Advance from explainable autonomy to **provably safe autonomy**: each agent change is guarded by formal invariants, improved by offline policy learning, and continuously compliant across tenants and environments—including partially disconnected/air‑gapped modes.

---

## Success KPIs (targets vs. v0.8)

| Area         | Target                                                                                |
| ------------ | ------------------------------------------------------------------------------------- |
| Agentic Dev  | ≥ **85** autonomous PRs/week; reviewer overrides < **3%**                             |
| Cost         | LLM **$/PR ≤ $0.72**; cache hit ≥ **90%**; CPU/GPU minutes/PR ↓ **15%**               |
| Quality      | Eval p95 ≥ **0.92**; robustness Δ ≤ **2%**                                            |
| Safety       | **Invariant coverage ≥ 90%** on critical flows; **0** safety‑class regressions        |
| Security/Gov | SLSA‑3 provenance on all artifacts; **0** policy violations; override audits **100%** |
| Reliability  | Incident MTTR ≤ **20 min**; Risk gate FP < **9%**                                     |

---

## Epics, Stories & Acceptance

### 1) Formal Invariants & Verified Changes

**Epic:** Encode system safety as **invariants** and enforce at CI + runtime.

- **V1. Invariant DSL + Checkers**  
  _Author invariants in YAML (state predicates, temporal expectations). Generate: (1) CI assertions via property tests, (2) runtime guards with lightweight overhead._  
  **Acceptance:** ≥ 20 critical invariants live; failing PRs show violated rule and counterexample.

- **V2. Model‑Checking Gate (TLA+/Alloy lite)**  
  _For critical modules (queues, retries, budget guards), run bounded model checks against a small spec on each PR._  
  **Acceptance:** Specs exist for 3 modules; CI gate blocks on violations; evidence attached to PR.

- **V3. Runtime Safeguards**  
  _Guard high‑risk actions with pre/post conditions and circuit breakers (policy reasons on trip)._  
  **Acceptance:** 100% high‑risk endpoints wrapped; breaker trip rate < 0.1%.

**Invariant DSL (YAML)**

```yaml
# invariants/agent_budget.yaml
id: INV.BUDGET.CAP
scope: agent_call
when:
  - event: model_call
assert:
  - expr: total_spend_usd <= budget_usd
    message: 'Budget exceeded: spent {{total_spend_usd}} > {{budget_usd}}'
```

**Runtime guard (TypeScript decorator)**

```ts
// server/safety/guard.ts
export function requireInvariant(
  check: (ctx: any) => { ok: boolean; msg?: string },
) {
  return (_: any, __: string, desc: PropertyDescriptor) => {
    const f = desc.value;
    desc.value = async function (...args: any[]) {
      const ctx = args[0] || {};
      const r = check(ctx);
      if (!r.ok)
        throw new Error(`InvariantViolation: ${r.msg || 'unspecified'}`);
      return f.apply(this, args);
    };
    return desc;
  };
}
```

**TLA+ CI gate (script stub)**

```bash
# scripts/tla-check.sh
set -euo pipefail
java -jar tools/tla2tools.jar -tool -deadlock -config specs/queue.cfg specs/queue.tla > artifacts/tla-queue.txt
```

---

### 2) Offline Policy Learning (from Logs) & Safer Exploration

**Epic:** Learn better routing/prompt policies from historical traces; deploy with **safe improvement**.

- **L1. Dataset & Features**  
  _Assemble per‑task tuples (context x, arm a, reward r, constraints c). Store in Parquet with privacy filters._  
  **Acceptance:** ≥ 50k high‑quality episodes logged; PII scrubbed.

- **L2. Off‑policy Evaluation (OPE)**  
  _IPS/DR estimates for candidate policies; reject if lower than baseline − ε._  
  **Acceptance:** Policy pushed only if OPE ≥ baseline; report attached to PR.

- **L3. Safe Deployment (ε‑greedy with constraints)**  
  _Roll out with capped exploration; fall back on violations; Decision Card notes policy delta & reason._  
  **Acceptance:** Cost ↓ ≥ 10% with Eval stable.

**IPS/DR sketch (TS)**

```ts
// services/policy/ope.ts
export function ips(
  samples: { p_beh: number; p_new: number; reward: number }[],
) {
  const w = samples.map((s) => (s.p_new / (s.p_beh + 1e-9)) * s.reward);
  return w.reduce((a, b) => a + b, 0) / samples.length;
}
```

---

### 3) Multimodal SEI: Code+Graph+Text Fusion

**Epic:** Better risk & planning via joint embeddings of **code graph**, **commit text**, and **review threads**.

- **M1. Graph Embeddings + RAG Upgrade**  
  _Node2Vec over code graph; concat with text embeddings; store in vector DB; retrieval powers risk explanations and planner context._  
  **Acceptance:** Risk AUC +0.02; planner uses fusion for 100% high‑risk PRs.

- **M2. Reviewer‑aware Style Adapter**  
  _LoRA/adapter that mimics repository’s style from diffs; use small model for implementation drafting._  
  **Acceptance:** Human nits per PR ↓ 20%; LLM $/PR ↓ 10%.

**Node2Vec ingestion (Python sketch)**

```python
# services/sei/embed_graph.py
import networkx as nx
from node2vec import Node2Vec
G = nx.read_gpickle('sei/code_graph.gpickle')
model = Node2Vec(G, dimensions=64, workers=2).fit(window=10, min_count=1)
model.wv.save_word2vec_format('artifacts/embeddings/code.vec')
```

---

### 4) Continuous Compliance: SLSA‑3, Evidence Bundles, & Data‑Lineage

**Epic:** Ship with auditable, verifiable evidence end‑to‑end.

- **C1. SLSA‑3 Provenance**  
  _Keyless signing (OIDC), attestation chain (build, sbom, policy). Verify on deploy._  
  **Acceptance:** 100% artifacts verifiable; deploy blocks on failure.

- **C2. Evidence Bundle**  
  _Attach Decision Cards, invariant report, eval/OPE summary, and provenance to each release._  
  **Acceptance:** Bundle present on 100% releases; auditor “one‑click” verifies.

- **C3. Data‑lineage for E2E**  
  _Track source→snapshot→test; TTL + redaction policy checked via OPA._  
  **Acceptance:** 0 PII escapes; lineage shown on PR.

---

### 5) Edge/Air‑Gapped Mode

**Epic:** Operate with **no external calls** using local models + cache priming.

- **E1. Local Model Router**  
  _llama.cpp/ggml runner with eviction‑aware prompt cache; fallback to rule‑based agents._  
  **Acceptance:** Passes 80% of eval scenarios offline; cost $/PR ~ $0.00 compute only.

- **E2. Sync & Seal**  
  _Signed model/policy/prompt bundles synced via artifact; checksum verified._  
  **Acceptance:** Tamper detection MTTR ≤ 5 min; sealed‑state report attached.

**Local runner wrapper (TS)**

```ts
// server/ai/localModel.ts
import { spawn } from 'child_process';
export async function runLocal(prompt: string) {
  return new Promise<string>((res, rej) => {
    const p = spawn('./llama', ['-p', prompt, '-n', '512']);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (c) => (c ? rej(new Error('local model failed')) : res(out)));
  });
}
```

---

### 6) Perf & GreenOps

**Epic:** Lower energy/CPU per PR while keeping latency tight.

- **G1. Idle‑Sleep & Burst Wake**  
  _Sleep agent pools on low load; wake on queue age thresholds (KEDA + signals)._  
  **Acceptance:** CPU min/PR ↓ 15% without SLA breaches.

- **G2. Bloom‑filter Skip**  
  _Probabilistically skip expensive analyzers when no relevant files changed._  
  **Acceptance:** Analyzer cost ↓ 30% with < 1% false skips (caught by nightly full run).

**Bloom filter (TS)**

```ts
// server/ci/bloom.ts
export function shouldRun(paths: string[], bloom: Uint8Array) {
  // hash each path → check bits; return false if all present (seen before & safe)
  const hit = paths.every((p) => has(bloom, hash(p)));
  return !hit; // if all seen, skip heavy analyzer
}
```

---

### 7) DX: Invariant Studio & jQuery Decision‑Card Viewer

**Epic:** Author, review, and visualize safety—and make it fast.

- **D1. Invariant Studio**  
  _Form‑based editor with schema validation and preview of generated tests/guards._  
  **Acceptance:** 10 new invariants authored this sprint.

- **D2. Decision‑Card Viewer (jQuery)**  
  _Single‑file UI to explore cards attached to a PR._  
  **Acceptance:** Reviewer can filter/sort cards; open constraints/reasons inline.

**Single‑file HTML (jQuery) viewer**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Decision Cards</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <style>
      body {
        font-family: sans-serif;
        margin: 20px;
      }
      .card {
        border: 1px solid #ddd;
        padding: 12px;
        border-radius: 12px;
        margin: 8px;
      }
      .meta {
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <input id="q" placeholder="filter…" />
    <button id="sortCost">sort by cost</button>
    <div id="list"></div>
    <script>
      $(function () {
        var cards = []; // fetch or inject
        function render() {
          $('#list').empty();
          var q = $('#q').val().toLowerCase();
          $.each(cards, function (_, c) {
            if (q && !JSON.stringify(c).toLowerCase().includes(q)) return;
            $('#list').append(
              '<div class="card"><div><b>' +
                c.taskId +
                '</b> → ' +
                c.chosenArm +
                '</div><div class=meta>eval ' +
                c.predictedEval.toFixed(2) +
                ' · $' +
                c.predictedCostUSD.toFixed(2) +
                ' · ±' +
                c.uncertainty.toFixed(2) +
                '</div><pre>' +
                c.rationale +
                '</pre></div>',
            );
          });
        }
        $('#sortCost').on('click', function () {
          cards.sort(function (a, b) {
            return a.predictedCostUSD - b.predictedCostUSD;
          });
          render();
        });
        $('#q').on('input', render);
        // demo
        cards = [
          {
            taskId: 't1',
            chosenArm: 'impl@small',
            predictedEval: 0.93,
            predictedCostUSD: 0.21,
            uncertainty: 0.04,
            rationale: 'Cheapest capable based on low risk & small diff.',
          },
        ];
        render();
      });
    </script>
  </body>
</html>
```

---

## Definition of Done (v0.9)

- Invariant DSL with CI + runtime guards; 20+ critical invariants; model‑checking gates for 3 modules.
- Offline policy learning with OPE guard; safe rollouts; cost ↓ ≥10% at same Eval.
- Fusion embeddings improve risk/planning; style adapter reduces reviewer nits by 20%.
- SLSA‑3 provenance; Evidence Bundles attached and verifiable.
- Air‑gapped mode passes 80% evals; sealed‑state verification live.
- GreenOps savings (CPU minutes/PR −15%); Bloom‑filter skip active with <1% false‑skips.
- Decision‑Card viewer + Invariant Studio used in reviews; ≥10 new invariants authored.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Invariant DSL scaffolding; first 8 invariants; runtime decorator wired.
- **D2:** TLA+/Alloy specs for queue/budget/retry; CI gate; failing cases fixed.
- **D3:** Build OPE pipeline; baseline policy snapshot; candidate policy train.
- **D4:** Guarded rollout (ε‑greedy); Decision Card notes policy deltas.
- **D5:** Graph embeddings & fusion retrieval; risk v2 calibration.
- **D6:** Style adapter experiment; integrate if non‑regressive.
- **D7:** SLSA‑3 verify on deploy; Evidence Bundle assembly.
- **D8:** Air‑gapped runner + sync‑and‑seal; tamper tests.
- **D9:** GreenOps (idle‑sleep, Bloom skip); perf/cost report.
- **D10:** Invariant Studio + viewer demo; chaos/retro/learning pack.

---

## Team Checklist

- [ ] 20+ invariants live; CI + runtime checks passing
- [ ] 3 model‑checked specs enforced
- [ ] OPE report attached to policy change PRs
- [ ] Fusion embeddings deployed; risk AUC +0.02
- [ ] SLSA‑3 verify + Evidence Bundles on releases
- [ ] Air‑gapped mode evaluation ≥80% pass
- [ ] CPU minutes/PR ↓ ≥15%
- [ ] Decision‑Card viewer and Invariant Studio adopted

---

## Revised Prompt (Maestro v0.9)

> You are Maestro Conductor v0.9. For every change: (1) load **invariants** and refuse unsafe plans with a clear reason; (2) use the **learned policy** if OPE ≥ baseline, else fall back; (3) retrieve **fusion context** (code graph + text) before planning; (4) produce a **Decision Card** and **Evidence Bundle**; (5) prefer offline/local models when in sealed mode; (6) engage **GreenOps** measures automatically. If blocked, output the smallest safe next step with cost and invariant rationale.

---

## Open Questions

1. Approve the first **3 modules** for model‑checking (queue, budget, retry?) and spec owners.
2. Confirm **privacy filters** for the offline dataset (PII redaction rules, retention TTL).
3. Choose the **vector DB** for fusion embeddings (pgvector vs. Qdrant vs. Redis).
4. Air‑gapped targets: which environments and allowed hardware (CPU‑only vs. GPU)?
5. Bloom‑filter scope: which analyzers are safe to skip and what nightly cadence for full runs?
