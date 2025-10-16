# Maestro Conductor v1.8 Sprint Plan

## “Value‑Optimal Autonomy” — Prove • Prioritize • Pay Less

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security/Governance, DX  
**Baseline (from v1.7):** 240 auto‑PRs/wk · LLM $/PR ≤ $0.21 · Eval p95 ≥ 0.955 · Policy Mutation Testing ≥85% · SpecLive 3.0 CEP · SPIFFE/SPIRE + Merkle Evidence

### Sprint Goal

Evolve Maestro into a **value‑optimal, proof‑carrying system** that continuously rebalances budgets, proves safety with machine‑checkable obligations, learns from reviewer preferences, and trims cost further through smarter builds, prompt compression, and GPU/bin‑packing—without losing speed or trust.

---

## Success KPIs (targets vs. v1.7)

| Area        | Target                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| Agentic Dev | ≥ **260** autonomous PRs/week; reviewer overrides < **0.6%**                            |
| Quality     | Eval p95 ≥ **0.957**; robustness Δ ≤ **1.5%**                                           |
| Safety      | **Proof‑Carrying PR** obligations satisfied on **100%** merges; **0** Sev‑1 regressions |
| Cost        | LLM **$/PR ≤ $0.18**; CI/CD compute/PR ↓ **12%**; GPU util ≥ **70%**                    |
| Governance  | Transparency log coverage **100%**; policy mutation coverage ≥ **90%**                  |
| DevEx       | Reviewer time ↓ **58%**; “One‑Click Fix‑It” success ≥ **85%**                           |

---

## Epics, Stories & Acceptance

### 1) Economic Autopilot — Budget Rebalancer & Dynamic Pricing

**Epic:** Optimize **value per dollar** across tenants, trains, and regions.

- **E1. ROI‑Aware Budget Rebalancer**  
  _Continuously shift LLM $ / CI minutes toward backlogs with highest **marginal ROI** under policy._  
  **Acceptance:** value‑weighted throughput +10% with spend unchanged.

- **E2. Dynamic Pricing for Agents**  
  _Apply internal “prices” to heavy actions during peak; agents choose cheaper capable alternatives._  
  **Acceptance:** peak spend ↓ 15% with no SLO breach.

**Rebalancer (TypeScript)**

```ts
// services/econ/rebalance.ts
type Bin = { id: string; budget: number; roi: number };
export function rebalance(bins: Bin[], total: number) {
  const w = bins.map((b) => Math.max(0, b.roi));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return bins.map((b, i) => ({ id: b.id, alloc: total * (w[i] / sum) }));
}
```

---

### 2) Proof‑Carrying Pull Requests (PCPR)

**Epic:** Every PR ships **machine‑checkable proof obligations** that the gate verifies before merge.

- **P1. Obligation Schema & Generator**  
  _Spec coverage, invariants, SpecLive CEP checks, mutation score, perf budget, risk cap, SBOM drift._  
  **Acceptance:** obligations emitted on 100% PRs.

- **P2. PCPR Verifier Gate**  
  _Validate each obligation; attach **Proof Card** to the PR with pass/fail and reasons._  
  **Acceptance:** merges blocked w/ human‑readable reason when any obligation fails.

**PCPR schema (JSON)**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProofCarryingPR",
  "type": "object",
  "properties": {
    "specCoverage": { "type": "number", "minimum": 0.9 },
    "invariants": { "type": "array", "items": { "type": "string" } },
    "cepGuards": { "type": "array", "items": { "type": "string" } },
    "mutationScore": { "type": "number", "minimum": 0.7 },
    "perfP95BudgetMs": { "type": "number" },
    "riskCap": { "type": "number", "maximum": 0.7 },
    "sbomCriticals": { "type": "number", "maximum": 0 }
  },
  "required": [
    "specCoverage",
    "invariants",
    "mutationScore",
    "perfP95BudgetMs",
    "riskCap",
    "sbomCriticals"
  ]
}
```

**Verifier (Node/TS)**

```ts
// services/pcpr/verify.ts
import Ajv from 'ajv';
import schema from './pcpr.schema.json';
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
export function verify(ob: any) {
  if (!validate(ob))
    throw new Error('PCPR fail: ' + JSON.stringify(validate.errors));
  return true;
}
```

---

### 3) RLHF‑Lite — Reviewer Preference Learning

**Epic:** Learn from reviewer approvals/rejections and comment preferences.

- **R1. Preference Pairs**  
  _Capture (A preferred over B) from review diffs, nit counts, revert likelihood._  
  **Acceptance:** ≥ 10k clean pairs collected; privacy scrubbed.

- **R2. Pairwise Ranker**  
  _Logistic pairwise model tunes router/prompt weights (offline → bandit online)._  
  **Acceptance:** +0.005 Eval and −5% cost on targeted tasks.

**Pairwise ranker (Python)**

```python
# services/rlhf/pairwise.py
import numpy as np
from sklearn.linear_model import SGDClassifier
X = np.load('pairs_X.npy')  # diff features
y = np.load('pairs_y.npy')  # 1 if A>B else 0
clf = SGDClassifier(loss='log', alpha=1e-4).fit(X, y)
np.save('artifacts/pairwise_coef.npy', clf.coef_)
```

---

### 4) CodeGraph‑360 — Graph‑of‑Graphs & Blast‑Radius Safety

**Epic:** Merge code, tests, incidents, SLOs, ownership, and deps into one **Graph‑of‑Graphs** for better planning & risk.

- **G1. Unified Graph Ingest**  
  _ETL repos, coverage, incidents, service maps, owners; dedupe to global IDs._  
  **Acceptance:** ≥ 95% entities linked.

- **G2. Blast‑Radius & Safety Margin**  
  _Compute cone of impact and required extra testing for risky PRs; show **why** in Decision Card._  
  **Acceptance:** false alarms < 8%; escape rate unchanged.

**Blast‑radius sketch (TS)**

```ts
// services/graph/blast.ts
export function blastRadius(
  files: string[],
  G: Record<string, string[]>,
  max = 3,
) {
  const seen = new Set(files);
  let frontier = files.slice();
  for (let d = 0; d < max; d++) {
    const next: string[] = [];
    frontier.forEach((f) =>
      (G[f] || []).forEach((n) => {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }),
    );
    frontier = next;
    if (!frontier.length) break;
  }
  return seen.size;
}
```

---

### 5) Build Automation vNext — Nix Partial Re‑derivation, Multi‑arch, Differential SBOM

**Epic:** Faster, cheaper, safer builds and artifacts.

- **B1. Partial Re‑derivation**  
  _Derive only affected Nix graph nodes for PRs; cache hits > 90% toolchains._  
  **Acceptance:** CI p95 ↓ 12% vs. v1.7.

- **B2. Multi‑arch Buildx**  
  _amd64+arm64 with provenance; choose arch by carbon/price._  
  **Acceptance:** carbon/PR ↓ 6% with no SLO hit.

- **B3. Differential SBOM Scan**  
  _Compare SBOM against last green; scan only deltas; high severity blocks with fix PR._  
  **Acceptance:** scan time −40%; zero criticals shipped.

**Diff SBOM (Node)**

```ts
// tools/sbom/diff.ts
export function diff(prev: any, cur: any) {
  const p = new Set(prev.packages.map((x: any) => x.purl));
  return cur.packages.filter((x: any) => !p.has(x.purl));
}
```

---

### 6) Inference Efficiency — Prompt Delta Cache & GPU Bin‑Pack

**Epic:** Pay less for the same or better results.

- **I1. Prompt Delta Cache**  
  _Cache normalized prompts; reuse deltas across similar tasks._  
  **Acceptance:** token output ↓ 12% on repeated chains.

- **I2. GPU Bin‑Packing Scheduler**  
  _First‑Fit‑Decreasing across VRAM/latency; prefer small models; preempt low‑priority jobs._  
  **Acceptance:** GPU util ≥ 70%; queue p95 < 10s.

**Delta cache (TS)**

```ts
// server/ai/promptCache.ts
const H = new Map<string, string>();
export function key(t: string) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}
export function getOrSet(k: string, v: string) {
  const kk = key(k);
  if (H.has(kk)) return H.get(kk)!;
  H.set(kk, v);
  return v;
}
```

**GPU pack (TS)**

```ts
// server/ai/gpuPack.ts
type Job = { id: string; vram: number; ms: number; prio: number };
export function pack(jobs: Job[], cap: number) {
  const q = jobs.slice().sort((a, b) => b.vram - a.vram);
  const bins: number[] = [];
  const alloc: Record<string, number> = {};
  for (const j of q) {
    let i = bins.findIndex((x) => x + j.vram <= cap);
    if (i < 0) {
      i = bins.push(0) - 1;
    }
    bins[i] += j.vram;
    alloc[j.id] = i;
  }
  return alloc;
}
```

---

### 7) Agents 7.0 — Reviewer‑Sim & Fix‑It Loops

**Epic:** Pre‑empt review nits and auto‑apply safe fixes.

- **A1. Reviewer‑Sim Agent**  
  _Runs repo‑style adapter + lint rules; suggests edits before human sees PR._  
  **Acceptance:** nit count −30%.

- **A2. One‑Click Fix‑It**  
  _jQuery overlay buttons to apply safe codemods, rename, doc patches, or escalate tests._  
  **Acceptance:** Fix‑It success ≥ 85%; actions fully audited.

**Fix‑It overlay (single‑file jQuery)**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Fix‑It</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <style>
      body {
        font-family: system-ui;
        margin: 16px;
      }
      .btn {
        margin: 4px;
      }
    </style>
  </head>
  <body>
    <div>
      <button class="btn" id="rename">Rename API</button
      ><button class="btn" id="docs">Patch Docs</button>
    </div>
    <script>
      $(function () {
        $('#rename').on('click', function () {
          $.post('/api/fixit/rename', { from: 'foo', to: 'bar' });
        });
        $('#docs').on('click', function () {
          $.post('/api/fixit/docs', { id: 'PR-1' });
        });
      });
    </script>
  </body>
</html>
```

---

### 8) Security & Governance — Transparency Log & PIIDetector v2

**Epic:** Every action is **tamper‑evident**; PII never escapes.

- **S1. Transparency Log (append‑only)**  
  _Write Merkle‑chained entries for merges, deployments, model calls; verify during audits._  
  **Acceptance:** 100% actions logged; verifier passes.

- **S2. PIIDetector v2**  
  _Regex + ML hybrid; block with reasons; redaction snippets auto‑apply._  
  **Acceptance:** 0 PII violations; false‑positive rate < 3%.

**Transparency entry (TS)**

```ts
// services/audit/transparency.ts
export function entry(evt: any, prev: string) {
  const now = Date.now();
  const data = JSON.stringify({ evt, now });
  const hash = sha256(prev + data);
  return { now, hash, data };
}
function sha256(s: string) {
  const c = require('crypto');
  return c.createHash('sha256').update(s).digest('hex');
}
```

---

## Definition of Done (v1.8)

- Economic Autopilot rebalances budgets to maximize marginal ROI; throughput +10% value with flat spend.
- **PCPR** obligations on 100% merges; Proof Cards attached; zero Sev‑1 escapes.
- RLHF‑lite pairs collected and ranker improves targeted tasks (+0.005 Eval, −5% cost).
- CodeGraph‑360 links ≥95% entities; Blast‑Radius safety reduces false alarms <8%.
- Nix partial re‑derivation + multi‑arch buildx + differential SBOM cut CI p95 by ≥12% and SBOM time by 40%.
- Prompt delta cache + GPU bin‑packing push GPU util ≥70% and drop token spend 12% on repeats.
- Reviewer‑Sim + One‑Click Fix‑It reduce nit count 30% with ≥85% action success.
- Transparency log verified; PIIDetector v2 enforces with <3% FPs.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Rebalancer + pricing hooks; dashboards.
- **D2:** PCPR schema + verifier; Proof Card tile; fail fast wiring.
- **D3:** Preference pair ETL; pairwise ranker; offline eval.
- **D4:** Bandit rollout of ranker; guard with SPRT; Decision Card notes.
- **D5:** Graph‑of‑Graphs ingest; blast‑radius computation; PR tile.
- **D6:** Nix partial re‑derivation; buildx multi‑arch; diff SBOM gate.
- **D7:** Prompt delta cache; GPU bin‑pack; load test.
- **D8:** Reviewer‑Sim + Fix‑It overlay; audit trails.
- **D9:** Transparency log; PIIDetector v2; redaction codemods.
- **D10:** Hardening; chaos drills; metrics lock; retro + learning pack.

---

## Team Checklist

- [ ] Budget rebalancer raising value throughput
- [ ] PCPR gate active; Proof Cards on PRs
- [ ] RLHF‑lite ranker online; guarded rollout clean
- [ ] Graph‑of‑Graphs populated; blast‑radius tile live
- [ ] Nix partial derivation + buildx + diff SBOM
- [ ] Prompt delta cache + GPU pack live
- [ ] Reviewer‑Sim + Fix‑It overlay adopted
- [ ] Transparency log + PIIDetector v2 passing

---

## Revised Prompt (Maestro v1.8)

> You are Maestro Conductor v1.8. Maximize **value per dollar** with a continuous **budget rebalancer** and internal dynamic pricing. Require **Proof‑Carrying PRs**—merge only when obligations (spec coverage, invariants, CEP guards, mutation, perf, risk, SBOM) verify. Learn from reviewers via **preference rankers** and update routing/prompt choices under safety constraints. Plan with **CodeGraph‑360** and run **partial re‑derivation** builds, **multi‑arch** images, and **differential SBOM** scans. Use **prompt delta caching** and **GPU bin‑packing** to cut inference cost. Pre‑empt nits with a **Reviewer‑Sim** and **One‑Click Fix‑It** overlay. Log all actions to the transparency ledger and block PII with reasons.

---

## Open Questions

1. ROI signal weighting for the **budget rebalancer** (defects avoided, latency saved, flake reduced, revenue proxy).
2. **PCPR** thresholds (mutation ≥0.7? perf p95 budgets by service?) and exception policy.
3. Which reviewer signals to include for **preference pairs** (nit count, revert, comment sentiment).
4. Approved **multi‑arch** targets (arm64 %, amd64 %) and carbon/price weights.
5. GPU fleet constraints (VRAM sizes) and priority tiers for bin‑packing.
6. Transparency log retention and auditor access scope.
