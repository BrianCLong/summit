# Maestro Conductor v0.6 Sprint Plan

## “Self‑Tuning Autonomy” — Learn • Adapt • Govern

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security, DX  
**Baseline (from v0.5 targets):** CD median ≤30m · Rollback MTTR ≤5m · Eval p95 ≥0.85 · 30 auto‑PRs/wk · LLM $/PR ≤$1.79

### Sprint Goal

Evolve Maestro from “eval‑gated delivery” to a **self‑optimizing system** that _learns which agent strategies, prompts, and models to use_ under strict policy and budget constraints. Introduce bandit‑driven routing, hermetic builds, KEDA autoscaling, and a richer SEI knowledge graph powering risk & impact.

---

## Success KPIs (targets vs. v0.5)

| Area         | Metric (target)                                                  |
| ------------ | ---------------------------------------------------------------- |
| CD           | Merge→prod median ≤ **20 min**; rollback MTTR ≤ **3 min**        |
| Eval Quality | PR Eval Score p95 ≥ **0.88**; robustness Δ ≤ **3%**              |
| Agentic Dev  | ≥ **40** autonomous PRs/week; reviewer override < **6%**         |
| Cost         | LLM **$/PR ≤ $1.35**; prompt/token cache hit ≥ **80%**           |
| Testing      | Flake rate < **0.3%**; mutation score ≥ **75%** on critical pkgs |
| Build        | Reproducible build rate ≥ **95%**; remote cache hit ≥ **70%**    |
| Reliability  | Risk gate FP < **12%**; SLO burn rate < **1**                    |

---

## Epics, Stories & Acceptance

### 1) Bandit‑Driven Agent & Model Routing

**Epic:** Choose the cheapest _capable_ chain/model per task using online learning.

- **A1. Thompson‑Sampling Router**  
  _Treat each (chain × model) as an arm; reward = EvalScore − λ·CostUSD. Use Thompson sampling to pick, update after each PR._  
  **Acceptance:** 20% cost drop vs. v0.5 at same pass rate; exploration ≤ 20% traffic.

- **A2. Prompt Evolution (Offline → A/B Online)**  
  _CMA‑ES/coordinate ascent on prompt params using scenario registry; deploy top‑N to bandit for online selection._  
  **Acceptance:** +0.02 absolute Eval Score lift on targeted tasks.

- **A3. Structured Outputs with Schemas**  
  _All agents emit JSON conforming to Zod schemas; automatic retry on schema violations with reason._  
  **Acceptance:** schema‑valid rate ≥ 99%; retries < 2 on p95.

**Router (TypeScript): Thompson Sampling with continuous reward**

```ts
// server/ai/bandit.ts
export type ArmId = string; // e.g., "planner_v2+implementer_v3@modelSmall"
export interface ArmStats {
  n: number;
  mean: number;
  m2: number;
} // Welford variance
export interface RewardCtx {
  evalScore: number;
  costUSD: number;
  lambda: number;
}

const stats = new Map<ArmId, ArmStats>();

function normReward({ evalScore, costUSD, lambda }: RewardCtx) {
  // Normalize to [0,1] approx: eval in [0,1], cost penalty scaled
  const r = Math.max(0, Math.min(1, evalScore - lambda * costUSD));
  return r;
}

export function sampleArm(arms: ArmId[]): ArmId {
  // Thompson over Beta approximation by mapping mean/variance to pseudo counts
  let best: { id: ArmId; score: number } | null = null;
  for (const id of arms) {
    const s = stats.get(id) || { n: 0, mean: 0.5, m2: 0.25 };
    const alpha = Math.max(1, s.mean * 20);
    const beta = Math.max(1, (1 - s.mean) * 20);
    const draw = betaSample(alpha, beta); // cheap approximation below
    if (!best || draw > best.score) best = { id, score: draw };
  }
  return best!.id;
}

export function updateArm(id: ArmId, r: number) {
  const s = stats.get(id) || { n: 0, mean: 0, m2: 0 };
  const n1 = s.n + 1;
  const delta = r - s.mean;
  const mean = s.mean + delta / n1;
  const m2 = s.m2 + delta * (r - mean);
  stats.set(id, { n: n1, mean, m2 });
}

function betaSample(a: number, b: number) {
  // Marsaglia method via two gamma draws; here a very small approx for speed
  function gamma(k: number) {
    const u = Math.random();
    return -Math.log(1 - u) * k;
  }
  const x = gamma(a),
    y = gamma(b);
  return x / (x + y);
}

export async function route(arms: ArmId[], ctx: RewardCtx) {
  const pick = sampleArm(arms);
  return {
    pick,
    report: (evalScore: number, costUSD: number) =>
      updateArm(pick, normReward({ evalScore, costUSD, lambda: ctx.lambda })),
  };
}
```

**Unit test (Jest)**

```ts
import { route, updateArm } from './bandit';

test('bandit learns cheaper equivalent arm', async () => {
  const arms = ['chainA@small', 'chainB@large'];
  const ctx = { lambda: 0.5, evalScore: 0.9, costUSD: 0.2 };
  let picksA = 0,
    picksB = 0;
  for (let i = 0; i < 200; i++) {
    const { pick, report } = await route(arms, ctx);
    if (pick === 'chainA@small') picksA++;
    else picksB++;
    // Simulate outcomes
    if (pick === 'chainA@small')
      report(0.9, 0.2); // good & cheap
    else report(0.9, 0.8); // same quality, pricier
  }
  expect(picksA).toBeGreaterThan(picksB);
});
```

**Schema‑guarded outputs (Zod)**

```ts
import { z } from 'zod';
export const ImplementerOut = z.object({
  patch: z.string().min(10),
  tests: z.array(z.string()),
  rationale: z.string().min(20),
});
export type ImplementerOut = z.infer<typeof ImplementerOut>;

export async function callImplementer(...): Promise<ImplementerOut>{
  const raw = await llmCall(...);
  const parsed = ImplementerOut.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('SchemaViolation: '+JSON.stringify(parsed.error.issues));
  return parsed.data;
}
```

---

### 2) Build & Integration: Hermetic + Remote Cache

**Epic:** Near‑reproducible builds with remote caching to crush CI time.

- **B1. Hermetic toolchain**  
  _Pin toolchain via devcontainer + asdf (Node, Python, Java); optional Nix flake for fully hermetic CI runner._  
  **Acceptance:** Repro build rate ≥95% (hash‑equal artifacts for same inputs).

- **B2. Remote cache for task graph**  
  _Self‑hosted S3 remote cache for Turborepo/Nx; cache keys include lockfiles + env hash._  
  **Acceptance:** cache hit ≥70%; CI p95 down another 20%.

**Turborepo remote cache (S3) minimal**

```ts
// tools/turbo-remote-s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: process.env.AWS_REGION });
export async function put(key: string, buf: Buffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.TURBO_BUCKET!,
      Key: key,
      Body: buf,
    }),
  );
}
export async function get(key: string) {
  try {
    const r = await s3.send(
      new GetObjectCommand({ Bucket: process.env.TURBO_BUCKET!, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  } catch (e) {
    return null;
  }
}
```

**Env hash to bust cache**

```bash
# scripts/env-hash.sh
set -euo pipefail
sha=$(sha256sum package-lock.json pnpm-lock.yaml poetry.lock 2>/dev/null | sha256sum | cut -d' ' -f1)
echo "ENV_HASH=$sha" >> $GITHUB_ENV
```

---

### 3) KEDA Autoscaling & SLO Guardrails

**Epic:** Scale workers to demand while respecting budgets and SLOs.

- **D1. KEDA for BullMQ/Redis**  
  _Autoscale agent workers on queue depth & age with max replicas capped by budget._  
  **Acceptance:** p95 queue wait < 30s under load; cost cap never exceeded.

- **D2. Error‑budget burn alerts**  
  _RED metrics → burn calculator; alert on 2× burn; trigger downshift mode (smaller models) automatically._  
  **Acceptance:** no SLO breaching deploys; downshift audit trail present.

**KEDA ScaledObject (Redis/BullMQ)**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: maestro-agents
spec:
  scaleTargetRef:
    name: agents-worker
  pollingInterval: 10
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata:
        addressFromEnv: REDIS_ADDR
        listName: bull:maestro:wait
        listLength: '50' # scale when >50 jobs waiting
```

---

### 4) SEI Knowledge Graph & Risk v2 (ML)

**Epic:** Centralize code/PR/test/incident telemetry in Neo4j; train a better risk model.

- **S1. Graph Ingest**  
  _Nodes: PR, File, Test, Owner, Incident, Package; Rels: touches, fails, owns, depends, causes._  
  **Acceptance:** 90% of PRs linked; dependency‑centrality available for planning & risk.

- **S2. Risk v2 (logit/GBM)**  
  _Train on historical labels (revert, post‑merge incident, flake); expose calibrated probability._  
  **Acceptance:** AUC ≥ 0.85; Brier score ≤ 0.18; thresholding policy documented.

**Ingest function (Node → Neo4j)**

```ts
import neo4j from 'neo4j-driver';
const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!),
);
export async function upsertPRGraph(pr: {
  id: number;
  files: string[];
  owner: string;
}) {
  const s = driver.session();
  try {
    await s.executeWrite(async (tx) => {
      await tx.run('MERGE (p:PR {id:$id}) SET p.updated=timestamp()', {
        id: pr.id,
      });
      for (const f of pr.files) {
        await tx.run(
          'MERGE (f:File {path:$p}) MERGE (p:PR {id:$id})-[:TOUCHES]->(f)',
          { p: f, id: pr.id },
        );
      }
      await tx.run('MERGE (u:Owner {name:$o}) MERGE (u)-[:OWNS]->(p)', {
        o: pr.owner,
        id: pr.id,
      });
    });
  } finally {
    await s.close();
  }
}
```

**Risk v2 trainer (Python sketch)**

```python
# services/sei/train_risk.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from joblib import dump

X = pd.read_parquet('sei/features.parquet')
y = X.pop('label')  # 1 if post-merge incident/regression
X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2,random_state=42)
model = CalibratedClassifierCV(GradientBoostingClassifier(), method='isotonic')
model.fit(X_train,y_train)
print('AUC ~', model.score(X_test,y_test))
dump(model, 'artifacts/risk_v2.joblib')
```

---

### 5) Performance & Testing Hardening

**Epic:** Prove speed and correctness with micro‑bench gates and deeper fuzzing.

- **T1. Microbench Harness + Gate**  
  _Jest‑bench (or tiny custom) for hot paths; gate on p95 regression > 10%._  
  **Acceptance:** perf report posted to PR; no regressions slip.

- **T2. Stateful/property fuzzing**  
  _fast‑check model‑based tests for stateful modules (queues, retries, caches)._  
  **Acceptance:** ≥ 2 model‑based tests per critical module; discovered bugs fixed.

**Jest microbench example**

```ts
test('parseGraph 1000x', () => {
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) parseGraph(sample);
  const dt = Date.now() - t0;
  expect(dt).toBeLessThan(200); // budget
});
```

---

### 6) Security & Policy

**Epic:** Auto‑remediate and explain; no surprises.

- **G1. SBOM Drift & Auto‑PRs**  
  _Detect new vulns vs. last baseline; agent opens bump PRs with changelog diff & risk note._  
  **Acceptance:** median time to remediate high vulns ≤ 2 days.

- **G2. Data‑flow & PII Guards**  
  _Lightweight detectors for PII usage in code paths; block unsafe exports; always include reason._  
  **Acceptance:** 0 PII policy violations; reasons attached to blocks.

---

## Definition of Done (v0.6)

- Bandit router live; prompt evolution offline + A/B online; schema‑guarded outputs with retries.
- Hermetic toolchain and remote cache reduce CI p95 by ≥20%; reproducible builds ≥95%.
- KEDA autoscaling keeps queue wait p95 <30s; SLO burn alerts trigger downshift & annotate traces.
- SEI knowledge graph powering risk v2 (AUC ≥0.85); PR Health Bot enriched with impact paths.
- Microbench gate active; property/model‑based tests added to hot modules.
- SBOM drift auto‑PRs; PII guards enforce with human‑readable reasons.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Wire bandit router scaffolding; define arms (top‑3 chains × 3 models).
- **D2:** Prompt evolution offline; select top‑N; add to router.
- **D3:** Zod schemas + retry policy; structured outputs enforced.
- **D4:** Remote cache backend + env hash; measure hits; devcontainer/asdf pinning.
- **D5:** KEDA deploy; autoscale tests; burn‑rate alerts with downshift.
- **D6:** SEI graph ingest; first dependency‑centrality surfaced in PR Bot.
- **D7:** Risk v2 training; calibrate threshold; PR gate flag off→warn→enforce.
- **D8:** Microbench harness + perf gate; begin fuzzing on hot paths.
- **D9:** SBOM drift → auto‑PR; PII guards stage to warn.
- **D10:** Enforce gates; chaos drill; retro + learning pack.

---

## Team Checklist

- [ ] Bandit router picks & updates reward per PR
- [ ] Prompt evolution pipeline produces candidates + reports
- [ ] Zod schemas enforced for all agent outputs
- [ ] Remote cache hits ≥70% in CI; reproducibility ≥95%
- [ ] KEDA scaling graph stable; burn alerts verified
- [ ] SEI graph populated; risk v2 deployed; thresholds documented
- [ ] Microbench/perf gate active; fuzz tests merged
- [ ] SBOM drift auto‑PRs; PII guard reasons visible

---

## Revised Prompt (Maestro v0.6)

> You are Maestro Conductor v0.6. Optimize **quality ÷ cost** using _bandit‑driven routing_. For each task: pick an arm (agent‑chain × model) using Thompson sampling with reward = EvalScore − λ·Cost. Emit **schema‑valid JSON** or retry with an explanation. Prefer affected‑only builds and cached reasoning. Attach to each PR: (1) chosen arm & alternatives, (2) Eval Score & robustness delta, (3) risk v2 & impact paths, (4) cost & token usage, (5) SBOM/provenance. Downshift automatically on SLO burn or budget pressure, and always provide a human‑readable reason when blocked.

---

## Open Questions

1. Choose **λ** (cost penalty weight) for reward: e.g., **0.5** to penalize $0.50 the same as 0.25 Eval Score.
2. Approve **remote cache backing** (S3 bucket name, retention policy).
3. **Autoscaling bounds** (min/max replicas) and daily cost ceiling for agent workers.
4. **Risk v2** deployment mode: warn for a week → enforce threshold 0.70, or enforce immediately at 0.75?
5. Enable **Nix flake** for CI runners now or keep optional via devcontainer/asdf only?
