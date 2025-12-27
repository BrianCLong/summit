# Maestro Conductor v0.8 Sprint Plan

## “Explainable, Governed Autonomy” — Predict • Justify • Constrain

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security/Governance, DX  
**Baseline (from v0.7 targets):** Org CI minutes −30% · LLM $/PR ≤ $1.05 · Eval p95 ≥ 0.88 · 55 auto‑PRs/wk · Risk gate FP < 10%

### Sprint Goal

Move from trusted autonomy to **explainable, policy‑constrained autonomy**: decisions are _predictive_, _justified in human language_, and _bounded by policy_ across tenants. We introduce contextual bandit routing, first‑class explanations (risk & router), OPA/Rego policy, test‑impact analysis, and multi‑tenant cost governance.

---

## Success KPIs (targets vs. v0.7)

| Area           | Target                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------- |
| Agentic Dev    | ≥ **70** autonomous PRs/week; reviewer override < **4%**                                     |
| Cost           | LLM **$/PR ≤ $0.89**; cache hit ≥ **88%**; GPU/CPU minutes/PR ↓ **15%**                      |
| Quality        | Eval p95 ≥ **0.90**; robustness Δ ≤ **2%**; mutation ≥ **75%** (critical pkgs)               |
| Explainability | 100% PRs include **Decision Card** (router/risk/policy reasons); avg reviewer time ↓ **25%** |
| Governance     | 100% actions checked via **OPA/Rego**; 0 policy violations; override audits 100% complete    |
| CI             | Test‑Impact Analysis cuts PR test time by **35%** with pass‑rate unchanged                   |

---

## Epics, Stories & Acceptance

### 1) Contextual Bandit Router (LinUCB + Safety)

**Epic:** Route (chain × model) using _context_ (task features) with safety constraints.

- **A1. LinUCB Contextual Bandit**  
  _Use task features (risk, tokens, file centrality, coverage delta, historical outcome) as context; per‑arm parameters via ridge regression; pick arm maximizing UCB._  
  **Acceptance:** −15% cost at same Eval; exploration ≤ 15%; regret curve trending down.

- **A2. Safety Constraints (Constrained UCB)**  
  _Enforce budget, policy, and minimum expected Eval via lower confidence bounds; fallback cascade when violated._  
  **Acceptance:** 0 safety violations; fallback logged with reason.

- **A3. Decision Cards (Human‑Readable)**  
  _Every agent step emits a “Decision Card”: chosen arm, alternatives, predicted Eval/Cost, uncertainty, and English rationale._  
  **Acceptance:** 100% PRs carry Decision Cards; satisfaction (reviewer poll) ≥ 4.5/5.

**LinUCB (TypeScript)**

```ts
// server/ai/linucb.ts
export type Vec = number[];
export type ArmId = string;
export interface Context {
  x: Vec; // normalized features
  safety: { maxUSD: number; minEval: number };
}
export interface Arm {
  id: ArmId;
  priceUSD: number;
}

// Per-arm A (dxd) and b (dx1); ridge lambda
export class LinUCB {
  d: number;
  alpha: number;
  lambda: number;
  A = new Map<ArmId, number[][]>();
  b = new Map<ArmId, number[]>();
  constructor(d: number, alpha = 1.2, lambda = 1e-2) {
    this.d = d;
    this.alpha = alpha;
    this.lambda = lambda;
  }
  private I() {
    const m = Array.from({ length: this.d }, (_, i) =>
      Array.from({ length: this.d }, (_, j) => (i === j ? this.lambda : 0)),
    );
    return m;
  }
  private matvec(M: number[][], v: number[]) {
    return M.map((r) => r.reduce((s, rv, i) => s + rv * v[i], 0));
  }
  private addOuter(M: number[][], v: number[]) {
    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        M[i][j] += v[i] * v[j];
      }
    }
  }
  private add(b: number[], v: number[]) {
    for (let i = 0; i < this.d; i++) b[i] += v[i];
  }
  private inv(M: number[][]) {
    // naive Gauss-Jordan; d is small (≤16)
    const n = M.length;
    const A = M.map((r) => r.slice());
    const I = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
    for (let i = 0; i < n; i++) {
      let p = i;
      while (p < n && Math.abs(A[p][i]) < 1e-12) p++;
      const tmp = A[i];
      A[i] = A[p];
      A[p] = tmp;
      const tmp2 = I[i];
      I[i] = I[p];
      I[p] = tmp2;
      const d = A[i][i];
      for (let j = 0; j < n; j++) {
        A[i][j] /= d;
        I[i][j] /= d;
      }
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const f = A[r][i];
        for (let c = 0; c < n; c++) {
          A[r][c] -= f * A[i][c];
          I[r][c] -= f * I[i][c];
        }
      }
    }
    return I;
  }
  private ensure(arm: ArmId) {
    if (!this.A.has(arm)) {
      this.A.set(arm, this.I());
      this.b.set(arm, Array(this.d).fill(0));
    }
  }
  pick(arms: Arm[], ctx: Context) {
    let best: { arm: Arm; ucb: number; mu: number; sigma: number } | null =
      null;
    for (const arm of arms) {
      this.ensure(arm.id);
      const A = this.A.get(arm.id)!;
      const b = this.b.get(arm.id)!;
      const Ainv = this.inv(A);
      const theta = this.matvec(Ainv, b);
      const mu = ctx.x.reduce((s, xi, i) => s + theta[i] * xi, 0);
      const sigma = Math.sqrt(
        ctx.x.reduce(
          (s, xi, i) =>
            s + xi * Ainv[i].reduce((a, aij, j) => a + aij * ctx.x[j], 0),
          0,
        ),
      );
      const ucb = mu + this.alpha * sigma;
      const lcb = mu - this.alpha * sigma;
      // safety: cost + expected eval threshold
      const safe =
        arm.priceUSD <= ctx.safety.maxUSD && lcb >= ctx.safety.minEval;
      const score = safe ? ucb : -Infinity;
      if (!best || score > best.ucb) best = { arm, ucb: score, mu, sigma };
    }
    return best!; // if all unsafe, caller cascades to safer pool
  }
  update(arm: ArmId, x: Vec, reward: number) {
    this.ensure(arm);
    this.addOuter(this.A.get(arm)!, x);
    this.add(
      this.b.get(arm)!,
      x.map((v) => v * reward),
    );
  }
}
```

**Decision Card (JSON Schema)**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "DecisionCard",
  "type": "object",
  "properties": {
    "taskId": { "type": "string" },
    "chosenArm": { "type": "string" },
    "alternatives": { "type": "array", "items": { "type": "string" } },
    "predictedEval": { "type": "number" },
    "predictedCostUSD": { "type": "number" },
    "uncertainty": { "type": "number" },
    "rationale": { "type": "string" }
  },
  "required": [
    "taskId",
    "chosenArm",
    "predictedEval",
    "predictedCostUSD",
    "uncertainty",
    "rationale"
  ]
}
```

---

### 2) Explainability: Risk/Routing Reasons

**Epic:** Turn scores into explanations the reviewer trusts.

- **E1. Linear‑attribution Explainer**  
  _For Risk v2 (GBM) also train a shadow linear model for local explanations; compute feature attributions per PR; render human summary._  
  **Acceptance:** 100% PRs show top‑5 risk drivers; reviewers agree ≥ 80% in sample.

- **E2. Router Rationale Generator**  
  _Translate LinUCB stats to natural language: which features favored the pick, what was rejected and why, expected cost/quality delta._  
  **Acceptance:** Included in Decision Card; no hallucinated claims in spot checks.

**Risk drivers (TypeScript) for linear shadow**

```ts
export function contributions(weights: number[], x: number[]) {
  const base = 0,
    contrib = weights.map((w, i) => w * x[i]);
  const score = base + contrib.reduce((a, b) => a + b, 0);
  const top = contrib
    .map((v, i) => ({ i, v }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 5);
  return { score, top };
}
```

---

### 3) Governance: OPA/Rego Policy Everywhere

**Epic:** Single policy plane for agents, CI/CD, and data access with human‑readable reasons.

- **G1. OPA Sidecar & Conftest**  
  _Evaluate policies (model caps, file access, dependency allow/deny, PII/export rules) as Rego; include reason strings; block on deny._  
  **Acceptance:** 100% gate decisions via OPA; overrides require justification stored in provenance.

- **G2. Policy Telemetry**  
  _Metric for allow/deny by rule; surface noisy rules; weekly policy tuning pack._  
  **Acceptance:** 100% policy hits logged with rule ID and reason; <3% noisy denies after tuning.

**Rego snippets**

```rego
package maestro.policy

# deny if path outside allowlist for write
violation[reason] {
  input.action == "write"
  not startswith(input.path, "server/")
  reason := sprintf("Writes to %s require human review", [input.path])
}

# model budget cap per PR
violation[reason] {
  input.kind == "model_call"
  sum(input.spends) > input.budget
  reason := sprintf("Budget exceeded: spent $%.2f > $%.2f", [sum(input.spends), input.budget])
}
```

**Node wrapper**

```ts
import { spawn } from 'child_process';
export async function opaEval(input: any) {
  return new Promise<string>((res, rej) => {
    const p = spawn('opa', ['eval', '-f', 'values', '-I', '-d', 'policy/'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    p.stdin.write(JSON.stringify(input));
    p.stdin.end();
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c ? rej(new Error(err || 'opa failed')) : res(out)));
  });
}
```

---

### 4) CI: Test‑Impact Analysis (TIA) + Flake Containment v2

**Epic:** Run only tests that matter; isolate and heal flakes faster.

- **C1. Graph‑based TIA**  
  _Use code graph + coverage map to select minimal test set for a PR._  
  **Acceptance:** PR test time −35% with stable pass rate.

- **C2. Flake Containment v2**  
  _If flake suspected, retry on isolated worker with deterministic seed/time; auto‑PR stabilization snippet._  
  **Acceptance:** Flake rate ≤ 0.2%; median stabilization < 24h.

**TIA (Cypher)**

```cypher
// Given changed files $files, select tests covering impacted code
MATCH (f:File) WHERE f.path IN $files
MATCH (f)<-[:COVERS]-(t:Test)
RETURN DISTINCT t.path AS tests;
```

---

### 5) Multi‑Tenant Cost Governance & Quotas

**Epic:** Per‑tenant fairness and hard ceilings without friction.

- **M1. Token‑Bucket Rate Limiter**  
  _Per tenant/model buckets; burst allowed; refill per minute._  
  **Acceptance:** No tenant exceeds quota; no starvation (p95 wait < 1s).

- **M2. Budget Enforcer + Alerts**  
  _Track spend vs. budget, alert at 80/100%; downshift automatically with Decision Card note._  
  **Acceptance:** Zero budget overages; alert latency < 30s.

**Limiter (TypeScript)**

```ts
// server/ai/quota.ts
import Redis from 'ioredis';
const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
export async function take(
  tenant: string,
  capacity: number,
  refillPerMin: number,
  cost: number,
) {
  const key = `q:${tenant}`;
  const now = Date.now();
  const s = JSON.parse(
    (await r.get(key)) || `{"tokens":${capacity},"ts":${now}}`,
  );
  const elapsed = (now - s.ts) / 60000;
  s.tokens = Math.min(capacity, s.tokens + elapsed * refillPerMin);
  if (s.tokens < cost)
    return {
      ok: false,
      waitMs: Math.ceil(((cost - s.tokens) / refillPerMin) * 60000),
    };
  s.tokens -= cost;
  s.ts = now;
  await r.set(key, JSON.stringify(s));
  return { ok: true, remaining: s.tokens };
}
```

---

### 6) DX: Repro Packs & Shadow Replays

**Epic:** Make reviews and incident repros trivial.

- **D1. Repro Pack**  
  _`maestro repro <PR>` bundles patch, fixtures, env, Decision Cards, eval artifacts into a 1‑click script._  
  **Acceptance:** Pack generated ≤ 30s; replay succeeds ≥ 95%.

- **D2. Shadow Replay**  
  _Run agent plan against recorded traces in shadow to validate impact; differences posted to PR._  
  **Acceptance:** 100% risky PRs get shadow diff; false alarms < 10%.

---

## Definition of Done (v0.8)

- LinUCB contextual router with safety + Decision Cards on all PRs; −15% cost at equal Eval.
- Risk/routing explanations posted; reviewers’ agreement ≥ 80%.
- OPA/Rego policy gates across agents/CI/CD with telemetry; 0 violations; overrides audited.
- Graph‑based TIA reduces PR test time by 35% with pass‑rate unchanged; flake ≤ 0.2%.
- Per‑tenant quotas + budget alerts live; no budget overruns.
- Repro Packs and Shadow Replays operational; reviewer time ↓ 25%.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Implement LinUCB core; define feature vector; wire safety bounds.
- **D2:** Decision Card schema + renderer; log alt arms & uncertainty.
- **D3:** Shadow linear explainer for risk; router rationale generator.
- **D4:** OPA/Rego policies + conftest; replace ad‑hoc checks; begin telemetry.
- **D5:** TIA Cypher + coverage map; integrate with CI; measure savings.
- **D6:** Flake v2 isolation + stabilization bot.
- **D7:** Quota limiter + budget alerts; Decision Card notes on downshift.
- **D8:** Repro Pack CLI + artifact bundling; Shadow Replay harness MVP.
- **D9:** Hardening, perf pass; policy tuning pack generated.
- **D10:** DR/chaos drill; finalize metrics; retro + learning pack.

---

## Team Checklist

- [ ] LinUCB router picks arms with context; safety fallback works
- [ ] Decision Cards attached to 100% PRs
- [ ] Risk/routing explanations accurate in spot checks
- [ ] OPA/Rego gates enabled in CI/CD/agents
- [ ] TIA reduces test time by ≥35%
- [ ] Flake rate ≤0.2% with auto‑stabilization PRs
- [ ] Quotas & alerts enforced; no overruns
- [ ] Repro Packs + Shadow Replays working end‑to‑end

---

## Revised Prompt (Maestro v0.8)

> You are Maestro Conductor v0.8. For each task, compute a **context vector** and choose an arm using **LinUCB** with safety constraints (budget, min Eval). Emit a **Decision Card** explaining the pick, alternatives, predicted Eval/Cost, and uncertainty. Before merge, produce **risk/routing explanations**, run **Test‑Impact Analysis**, and pass **OPA/Rego** policy gates. Downshift automatically under quota/budget pressure and record the reason. Attach a **Repro Pack** and, when risky, a **Shadow Replay** diff.

---

## Open Questions

1. Confirm **feature set** for the context vector (tokens, risk, centrality, coverage delta, churn, owner count, …).
2. Approve Rego policy locations (repo paths) and rule ownership model.
3. Preferred coverage source for TIA (Jest/Istanbul + Pytest‑cov merge).
4. Tenant quota defaults (capacity/refill) and budget alert channels.
5. Shadow replay data retention & privacy constraints (TTL, PII redaction).
