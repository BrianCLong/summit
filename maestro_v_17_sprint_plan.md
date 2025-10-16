# Maestro Conductor v1.7 Sprint Plan

## “Autonomous Governance Loop” — Explain • Tune • Prove

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security/Governance, DX  
**Baseline (from v1.6):** 220 auto‑PRs/wk · LLM $/PR ≤ $0.24 · Eval p95 ≥ 0.952 · SpecLive 2.0 (20+ mined props) · CPO‑lite router + Trust Ledger · Nix+REv3 hermetic CI · Evidence API v2

### Sprint Goal

Close the loop: Maestro **explains** every decision, **tunes** itself with safe experiments, and **proves** compliance & safety _before_ and _after_ change. We introduce **policy mutation testing**, **dueling‑bandit prompt evolution**, **SpecLive 3.0 (event/temporal CEP)**, **hypergraph‑accelerated TIA v3**, **SPIFFE/SPIRE identity**, and **Merkle‑anchored evidence manifests**—while cutting cost and reviewer effort again.

---

## Success KPIs (targets vs. v1.6)

| Area        | Target                                                                                 |
| ----------- | -------------------------------------------------------------------------------------- |
| Agentic Dev | ≥ **240** autonomous PRs/week; reviewer overrides < **0.7%**                           |
| Quality     | Eval p95 ≥ **0.955**; robustness Δ ≤ **1.6%**                                          |
| Safety      | SpecLive+invariant coverage ≥ **99%** on critical flows; **0** Sev‑1 regressions       |
| Cost        | LLM **$/PR ≤ $0.21**; cache hit ≥ **97.5%**; CI/CD compute/PR ↓ **10%**                |
| Governance  | **Policy mutation coverage ≥ 85%**; Evidence manifest Merkle‑anchored on 100% releases |
| Reliability | Global failover < **90s**; queue p95 wait < **10s** under 2× load                      |
| DevEx       | Reviewer time ↓ **55%**; Repro Pack ≤ **8s**                                           |

---

## Epics, Stories & Acceptance

### 1) Governance Loop: Policy Mutation Testing (PMT) & Auto‑Tuning

**Epic:** Prove our policies actually block what they claim; tune noisy rules.

- **G1. Policy Mutator**  
  _Generate equivalent and adversarial Rego mutations; ensure denies/pass hold._  
  **Acceptance:** mutation coverage ≥85%; noisy‑deny rate <3% after tuning.

- **G2. Auto‑Tuning & Rollback**  
  _Noisy rules get thresholds adjusted via bandit selection; instant revert on false‑allows._  
  **Acceptance:** 0 false‑allow in a week; reasons logged.

**Rego mutation fuzzer (TypeScript)**

```ts
// services/policy/mutate.ts
import { opaEval } from './opa';
const tweaks = [
  (p: string) => p.replace(/startswith\(/g, 'contains('),
  (p: string) => p.replace(/>=/g, '>'),
  (p: string) => p.replace(/budget\s*>/g, 'budget >= '),
];
export async function mutateAndTest(policy: string, inputs: any[]) {
  const variants = tweaks.map((t) => t(policy));
  const results = [] as any[];
  for (const v of variants) {
    let ok = true;
    for (const inp of inputs) {
      const r = await opaEval({ policy: v, input: inp });
      ok = ok && (r.denies > 0 || inp.safe === true);
    }
    results.push({ variant: 'hash:' + hash(v), survives: ok });
  }
  return results;
}
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(16);
}
```

---

### 2) Prompt Genome & Dueling‑Bandit Evolution

**Epic:** Evolve prompts continuously with **dueling bandits** and Decision‑Card explanations.

- **P1. Prompt Genome Registry**  
  _Parametric prompt templates + lineage and constraints (safety, style, citations)._  
  **Acceptance:** 100% agent prompts in registry with lineage; schema‑valid.

- **P2. Dueling Bandit Online Optimizer**  
  _Interleave two prompts; update win‑rates by EvalScore/Cost; pick best._  
  **Acceptance:** +0.01 Eval lift at −8% cost across targeted tasks.

**Dueling bandit (TS, RUCB)**

```ts
// services/prompt/duel.ts
export type Arm = string;
const wins = new Map<Arm, number>();
const plays = new Map<Arm, number>();
export function pick(arms: Arm[]): [Arm, Arm] {
  const s = arms
    .map((a) => {
      const n = plays.get(a) || 1,
        w = wins.get(a) || 0;
      const u = w / n + Math.sqrt((2 * Math.log(total() + 1)) / n);
      return { a, u };
    })
    .sort((x, y) => y.u - x.u);
  return [s[0].a, s[1].a];
}
export function update(winner: Arm, loser: Arm) {
  wins.set(winner, (wins.get(winner) || 0) + 1);
  plays.set(winner, (plays.get(winner) || 0) + 1);
  plays.set(loser, (plays.get(loser) || 0) + 1);
}
function total() {
  let t = 0;
  plays.forEach((n) => (t += n));
  return t;
}
```

---

### 3) SpecLive 3.0 — Event/Temporal CEP Guards

**Epic:** Compile Spec cards to **CEP** rules over traces (OTEL), including temporal patterns.

- **S1. Stream Processor**  
  _Detect sequences like `save → retry ≤3 times within 2s → success`._  
  **Acceptance:** ≥15 temporal guards added; overhead p95 <1%.

- **S2. Violation Bundles**  
  _Emit minimum repro bundle on violation (logs, trace IDs, data seeds)._  
  **Acceptance:** 95% repro success; PR opened automatically.

**CEP sketch (Node)**

```ts
// services/speclive/cep.ts
export function detect(
  seq: string[],
  events: { t: number; k: string }[],
  windowMs: number,
) {
  let i = 0,
    start = events[0]?.t || 0;
  for (const e of events) {
    if (e.k === seq[i]) {
      if (i === 0) start = e.t;
      i++;
      if (i === seq.length) return { ok: true, dt: e.t - start };
    }
    if (e.t - start > windowMs) i = 0;
  }
  return { ok: false };
}
```

---

### 4) Hypergraph‑Accelerated TIA v3 & Impact Explanations

**Epic:** Use hypergraph adjacency to pick **minimal** tests and **explain** why they were chosen.

- **H1. Sparse Ops Path‑Cost**  
  _Approximate influence via k‑hop weighted paths; choose tests with highest marginal coverage._  
  **Acceptance:** PR test time −10% further with equal escape rate.

- **H2. Explainable TIA**  
  _Decision Card shows path snippets (file→symbol→test) that justified selection._  
  **Acceptance:** Reviewer agreement ≥85%.

**Path‑cost sketch (TS)**

```ts
// services/hypergraph/path.ts
export function score(
  file: string,
  test: string,
  edges: Record<string, string[]>,
) {
  // simple BFS depth<=3
  const q = [file];
  const seen = new Set([file]);
  let step = 0;
  while (q.length && step < 3) {
    const cur = q.shift()!;
    if (cur === test) return 1 / (step + 1);
    for (const n of edges[cur] || [])
      if (!seen.has(n)) {
        seen.add(n);
        q.push(n);
      }
    step++;
  }
  return 0;
}
```

---

### 5) Identity & Provenance: SPIFFE/SPIRE + Merkle Evidence Manifests

**Epic:** Strong workload identity and **tamper‑evident** evidence.

- **I1. SPIFFE/SPIRE for Agents**  
  _mTLS with SPIFFE IDs for each agent; workload attestation checks._  
  **Acceptance:** 100% agent calls mutual‑auth’d; failure mode tested.

- **I2. Merkle‑Anchored Evidence**  
  _Hash all artifacts; store Merkle root in immutably logged channel (append‑only store)._  
  **Acceptance:** 100% releases carry Merkle root; auditor verifies one‑click.

**Merkle manifest (TS)**

```ts
// services/evidence/merkle.ts
import crypto from 'crypto';
export function merkleRoot(files: { name: string; buf: Buffer }[]) {
  let layer = files.map((f) => sha(f.buf));
  while (layer.length > 1) {
    const next = [] as string[];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(sha(Buffer.from(layer[i] + (layer[i + 1] || layer[i]))));
    }
    layer = next;
  }
  return layer[0];
}
function sha(b: Buffer) {
  return crypto.createHash('sha256').update(b).digest('hex');
}
```

---

### 6) Build & Infra: Nix Binary Mirror • REv4 Sandboxing • Carbon‑Aware Schedulers

**Epic:** Faster, cheaper, greener builds.

- **B1. Nix Binary Cache Mirror**  
  _Org‑local cache; prewarm common derivations; provenance pinned._  
  **Acceptance:** CI p95 −8%; cache hit > 90% for toolchains.

- **B2. Remote Execution v4 (Sandbox)**  
  _Per‑step sandbox profiles; escape detection; auto‑quarantine worker._  
  **Acceptance:** 0 sandbox escapes; jobs migrate automatically.

- **B3. Carbon‑Aware Job Scheduler**  
  _Delay non‑urgent jobs into low‑carbon windows/regions; Decision Card notes deferral._  
  **Acceptance:** carbon/PR −8% with no SLO impact.

---

### 7) SEI v5 — Shapley Value of Change & Reviewer Ghost

**Epic:** Attribute value to changes and pre‑empt review nits.

- **S1. Shapley Attribution**  
  _Approximate marginal contribution of change to KPIs via sampling._  
  **Acceptance:** KPI attribution shown on PR; disputes <10%.

- **S2. Ghost Reviewer**  
  _Suggest nit‑fixes (naming, docs, style) pre‑PR using repository style adapter; jQuery overlay._  
  **Acceptance:** reviewer nit count −30%.

**Shapley sketch (TS)**

```ts
// services/sei/shapley.ts
export function shapley(gains: number[], k = 100) {
  const n = gains.length;
  const phi = Array(n).fill(0);
  for (let s = 0; s < k; s++) {
    const order = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    let acc = 0;
    for (const i of order) {
      const before = acc;
      acc += gains[i];
      phi[i] += acc - before;
    }
  }
  return phi.map((v) => v / k);
}
```

---

### 8) DX: Maestro Studio (single‑file jQuery)

**Epic:** All decisioning in one place: policy results, duels, CEP guards, hypergraph paths, evidence Merkle.

**Studio UI (single‑file)**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Maestro Studio</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <style>
      body {
        font-family: system-ui;
        margin: 16px;
      }
      .card {
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 10px;
        margin: 8px;
      }
    </style>
  </head>
  <body>
    <div class="card" id="dc">
      <b>Decision Card</b>
      <div id="dcv"></div>
    </div>
    <div class="card">
      <b>Prompt Duel</b>
      <div id="duel"></div>
      <button id="voteA">A wins</button><button id="voteB">B wins</button>
    </div>
    <div class="card">
      <b>SpecLive 3.0</b>
      <div id="cep"></div>
    </div>
    <div class="card">
      <b>Hypergraph Path</b>
      <pre id="path"></pre>
    </div>
    <div class="card">
      <b>Evidence Merkle</b>
      <div id="merkle"></div>
    </div>
    <script>
      $(function () {
        $('#dcv').text('arm impl@small · eval 0.956 · $0.19');
        $('#duel').text('A: planner_v5 / B: planner_v6');
        $('#cep').text('save→retry≤3→success (1.2s) OK');
        $('#path').text('server/a.ts → func X → test T1');
        $('#merkle').text('root: 3f9a…c1');
        $('#voteA').on('click', () => $.post('/api/duel', { winner: 'A' }));
        $('#voteB').on('click', () => $.post('/api/duel', { winner: 'B' }));
      });
    </script>
  </body>
</html>
```

---

## Definition of Done (v1.7)

- Policy Mutation Testing achieves ≥85% coverage; noisy‑deny rate <3%; 0 false‑allow in weeklong run.
- Dueling‑bandit prompt evolution lifts Eval by +0.01 at −8% cost for targeted tasks.
- SpecLive 3.0 adds ≥15 temporal CEP guards; violation bundles auto‑open PRs.
- Hypergraph TIA v3 cuts PR test time a further 10% with unchanged escape rate; path explanations present.
- SPIFFE/SPIRE mTLS for agent calls; Merkle‑anchored Evidence manifests on 100% releases.
- Nix binary mirror + REv4 sandboxing reduce CI cost/latency; carbon/PR −8% via deferrals.
- SEI v5 shows Shapley attribution; Ghost Reviewer cuts nit comments by 30%.
- Maestro Studio overlay adopted by ≥85% of reviewers; decision time down 55%.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Policy mutator + seed suites; coverage dashboard.
- **D2:** Auto‑tuning loop; noisy rule fixes; guardrails.
- **D3:** Prompt genome registry; dueling‑bandit online loop.
- **D4:** SpecLive CEP processor; first 10 temporal guards.
- **D5:** Hypergraph path‑cost + explainable TIA tile.
- **D6:** SPIFFE/SPIRE rollout; mTLS in agents; failure drills.
- **D7:** Merkle evidence manifest + auditor verifier.
- **D8:** Nix binary mirror; REv4 sandbox profiles; carbon‑aware scheduling.
- **D9:** Shapley attribution + Ghost Reviewer; Maestro Studio MVP.
- **D10:** Hardening; chaos; metrics lock; retro + learning pack.

---

## Team Checklist

- [ ] Mutation coverage ≥85%; noisy‑denies <3%
- [ ] Dueling prompts +0.01 Eval at −8% cost
- [ ] SpecLive CEP: 15+ guards, bundles attach to PRs
- [ ] Hypergraph TIA v3 saves ≥10% time
- [ ] SPIFFE mTLS live; Merkle roots on releases
- [ ] Nix mirror + REv4 + carbon deferrals active
- [ ] Shapley attribution + Ghost Reviewer live
- [ ] Maestro Studio adopted ≥85%

---

## Revised Prompt (Maestro v1.7)

> You are Maestro Conductor v1.7. Maintain a **governance loop**: (1) run **Policy Mutation Tests** on risky changes; (2) evolve prompts via **dueling bandits** and document the win with a Decision Card; (3) enforce **SpecLive 3.0** temporal CEP guards and attach violation bundles; (4) choose tests via **hypergraph TIA** and explain the path; (5) sign artifacts into a **Merkle Evidence** manifest under **SPIFFE** identity; (6) schedule non‑urgent work in low‑carbon windows. If blocked, output the smallest safe next step with cost, risk, and policy rationale.

---

## Open Questions

1. Which **policy families** to prioritize in mutation testing (data‑residency, budget, model caps, IAM)?
2. Scope for **prompt duels** (which agents/tasks) and success metric weighting (Eval vs. $ vs. robustness)?
3. Initial **temporal guards** to compile in SpecLive 3.0; acceptable latency windows?
4. Hypergraph explainability detail level on PR (top‑1 path vs. top‑3)?
5. SPIFFE/SPIRE rollout boundaries and fallback for air‑gapped cells?
6. Carbon deferral limits (max wait per job, te
