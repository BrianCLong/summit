# Maestro Conductor v0.5 Sprint Plan

## “Evaluate, Trust, and Ship” — Autonomous Release Train to Production

**Sprint length:** 10 working days  
**Owners:** Platform (CI/CD/infra), Agents, SEI (Engineering Intelligence), Security  
**Baseline (from v0.4 targets):** CI p95 ≤10.6m · LLM $/PR ≤$2.24 · Flake <0.5% · 20 auto‑PRs/wk · Risk gate live

### Sprint Goal

Graduate from fast/cheap PRs to **evaluation‑gated progressive delivery** with measurable trust: every agent change is scored by an eval harness and shipped via canary/rollout when scores clear thresholds.

---

## Success KPIs (targets vs. v0.4)

| Area          | Metric (target)                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------ |
| CD            | Median time from merge → prod ≤ **30 min**; automated rollback MTTR ≤ **5 min**                  |
| Eval Quality  | PR Eval Score ≥ **0.85** p95; false‑negative regressions **0**                                   |
| Agentic Dev   | ≥ **30** autonomous PRs merged/week; reviewer override < **8%**                                  |
| Cost          | LLM **$/PR ↓ 20%** (≤ **$1.79**); token cache hits ≥ **70%**                                     |
| Test Strength | Mutation score ≥ **70%** on critical packages; property‑based test coverage ≥ **3 props/module** |
| Data Safety   | **0** policy violations; 100% changes carry provenance + policy reasons                          |

---

## Epics, Stories & Acceptance

### 1) Progressive Delivery & Release Engineering

**Epic:** Continuous deployment with safety valves, health signals, and instant rollback.

- **R1. Canary + Progressive Rollouts**  
  _Argo Rollouts/Flagger or GitHub Actions + stepwise traffic shift; health based on SLO probes & synthetic checks._  
  **Acceptance:** 10%→50%→100% auto‑promotion when green; rollback under 5 minutes on failure.

- **R2. Zero‑Downtime DB Migrations**  
  _Expand‑and‑contract pattern with background backfill and dual‑write guard._  
  **Acceptance:** deploys while reads/writes continue; migration dashboard shows lag & completion.

- **R3. GitOps Manifests + Environment Guards**  
  _Manifests versioned; promotion via PRs; environment protection rules enforced._  
  **Acceptance:** every prod change traceable to Git commit + provenance.

**CD pipeline skeleton (GitHub Actions):**

```yaml
name: cd
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Render manifests
        run: ./scripts/render-manifests.sh ${{ github.sha }} > k8s/rendered/
      - name: Canary 10%
        run: ./scripts/deploy.sh k8s/rendered --strategy=canary --step=10
      - name: Health Gate
        run: ./scripts/health-gate.sh --min-score 0.85 --timeout 5m
      - name: Promote 50%
        run: ./scripts/deploy.sh k8s/rendered --strategy=canary --step=50
      - name: Health Gate 2
        run: ./scripts/health-gate.sh --min-score 0.85 --timeout 5m
      - name: Promote 100%
        run: ./scripts/deploy.sh k8s/rendered --strategy=canary --step=100
```

**Health gate (combines SLO + eval score):**

```bash
# scripts/health-gate.sh
set -euo pipefail
MIN=${1:-0.85}
score=$(curl -sf $EVAL_GATE_URL | jq -r .score)
lat=$(curl -sf $SLO_API/latency | jq -r .p95)
err=$(curl -sf $SLO_API/error_rate | jq -r .value)
if awk "BEGIN {exit !($score >= $MIN && $lat < 300 && $err < 0.01)}"; then
  echo "HEALTH OK: score=$score p95=${lat}ms err=${err}"
else
  echo "HEALTH FAIL: score=$score p95=${lat}ms err=${err}" >&2
  exit 1
fi
```

---

### 2) Evaluation Harness (“Maestro Evals”) & Policy Reasons Everywhere

**Epic:** A first‑class eval system that scores changes before/after merge and explains blocks.

- **E1. Eval DSL + Scenario Registry**  
  _YAML scenarios with fixtures, prompts, expected behaviors, and scoring functions (exact/semantic/structured)._  
  **Acceptance:** 100% agent prompts have ≥ 3 eval scenarios; PRs show Eval Score tile.

- **E2. Perturbation & Robustness Tests**  
  _Noise, paraphrase, and adversarial examples auto‑generated; regression if score delta > threshold._  
  **Acceptance:** robustness Δ score ≤ 5% on p95.

- **E3. Policy Reasoner**  
  _Every block includes human‑readable reason + suggested fix; exported to provenance._  
  **Acceptance:** 100% policy denials have reasons; appeal workflow emits audit trail.

**Eval scenario (YAML) + runner:**

```yaml
# evals/implement.fix-test.yaml
id: implement.fix-test@v2
fixtures:
  - failing_tests: 'tests/service_A.spec.ts::should_retry'
    context_files: ['server/serviceA.ts', 'server/retry.ts']
checks:
  - type: patch_applies
  - type: tests_pass
  - type: risk_score_max
    max: 0.65
  - type: structured_requirements
    require:
      - 'adds test that reproduces prior failure'
      - 'does not change public API'
scoring:
  exact: 0.4
  tests: 0.4
  risk: 0.2
threshold: 0.85
```

```ts
// services/evals/runner.ts
import fs from 'fs';
export async function runEval(id: string): Promise<number> {
  const def = parseYaml(fs.readFileSync(`evals/${id}.yaml`, 'utf8'));
  // 1) apply patch, 2) run tests, 3) compute risk, 4) structured checks
  const s = 0.91; // mocked score
  await fs.promises.writeFile(
    `artifacts/evals/${id}.json`,
    JSON.stringify({ score: s }, null, 2),
  );
  return s;
}
```

---

### 3) Agentic Engineering v3 (SpecSynth, RefactorSurgeon, Resolver)

**Epic:** Safer, smarter changes guided by specs, AST‑aware refactors, and robust entity resolution.

- **A1. SpecSynth Agent**  
  _Generate minimal verifiable spec (Given/When/Then + acceptance) before implementation._  
  **Acceptance:** Spec attached to PR; tests trace back to spec IDs.

- **A2. RefactorSurgeon (AST‑aware)**  
  _Use ts‑morph/jscodeshift for codemods; ensure behavior preservation via snapshot tests._  
  **Acceptance:** ≥ 3 large‑scale refactors with zero regressions; mutation score stays ≥ 70%.

- **A3. Resolver for Entity/Dependency Graph**  
  _Neo4j‑powered code graph (files, symbols, imports, owners, risk); agents query it to plan safe edits._  
  **Acceptance:** Dependency‑centrality consulted in 100% risk scores; hot‑paths identified.

**AST codemod (ts‑morph) example:**

```ts
// tools/codemods/renameMethod.ts
import { Project } from 'ts-morph';
const p = new Project();
p.addSourceFilesAtPaths('server/**/*.ts');
for (const f of p.getSourceFiles()) {
  f.getDescendantsOfKind(ts.SyntaxKind.MethodDeclaration)
    .filter((m) => m.getName() === 'retry')
    .forEach((m) => m.rename('retryWithJitter'));
}
p.saveSync();
```

**Code graph (Cypher) seeds:**

```cypher
MERGE (f:File {path:$path})
WITH f UNWIND $imports AS imp
MERGE (g:File {path:imp})
MERGE (f)-[:IMPORTS]->(g);
```

---

### 4) Test Strengthening: Mutation & Property‑Based

**Epic:** Tests that prove correctness and catch silent breakages.

- **T1. Mutation Testing (JS/TS via Stryker)**  
  **Acceptance:** Mutation score ≥ 70% on critical packages; reports posted to PR.

- **T2. Property‑Based Tests**  
  _fast‑check (TS) + Hypothesis (Python) for core transforms._  
  **Acceptance:** ≥ 3 properties/module on hot paths; shrinked counterexamples attached to issues.

**Stryker config:**

```json
{
  "$schema": "https://json.schemastore.org/stryker.schema.json",
  "mutate": ["server/src/**/*.ts"],
  "testRunner": "jest",
  "checkers": ["typescript"],
  "thresholds": { "high": 80, "low": 60, "break": 70 }
}
```

**Property‑based (TS / fast‑check):**

```ts
import fc from 'fast-check';
import { normalize } from '../lib/strings';

test('normalize is idempotent', () => {
  fc.assert(
    fc.property(fc.string(), (s) => normalize(normalize(s)) === normalize(s)),
  );
});
```

**Property‑based (Python / Hypothesis):**

```python
from hypothesis import given, strategies as st
from lib.text import normalize

@given(st.text())
def test_normalize_idempotent(s):
    assert normalize(normalize(s)) == normalize(s)
```

---

### 5) Cost & Model Efficiency

**Epic:** Same or better quality at lower cost through routing, caching, and small‑model leverage.

- **C1. Distilled Prompt Paths**  
  _Cache canonical reasoning for recurring tasks; answer with templated small‑model outputs where safe._  
  **Acceptance:** 70%+ hits on frequent tasks; quality unchanged (Eval Score Δ≤1%).

- **C2. Router Calibration**  
  _Collect labels of model picks vs. outcomes; update thresholds; report savings._  
  **Acceptance:** ≥ 20% LLM $/PR reduction vs. v0.4 with same pass rate.

---

### 6) Observability & SEI

**Epic:** Make decisions visible: why an agent chose X, why CD rolled back, where time and tokens go.

- **O1. Token/Cost Exemplars**  
  _Attach token & $ usage to traces; link to PR comment and eval artifact._  
  **Acceptance:** Each agent step shows cost; weekly report of top savers/spenders.

- **O2. Outlier Analyzer**  
  _Auto‑open issues when eval scores degrade or rollout fails; include repro bundle._  
  **Acceptance:** 100% anomalies produce actionable bug with context.

---

## Definition of Done (v0.5)

- Evaluation harness with scenario registry; PR Eval Score shown and enforced in CD gate (≥0.85).
- Canary/progressive rollout with auto‑promotion & rollback; zero‑downtime DB migration pattern in place.
- SpecSynth + RefactorSurgeon agents live; Neo4j code graph used by risk score & planning.
- Mutation testing and property‑based tests integrated; mutation score ≥70% for critical packages.
- LLM cost/PR ≤$1.79; token cache ≥70%; router calibration report published.
- All blocks have human‑readable policy reasons; provenance manifests attached to releases.

---

## Day‑by‑Day Plan (10 days)

- **D1–2:** Ship eval DSL + runner; seed 3 scenarios per critical prompt; add PR Eval Score tile.
- **D3–4:** Progressive rollout scripts + health gate; synthetic probes; rollback path verified.
- **D5:** Expand‑and‑contract migration framework; dashboard for backfill lag.
- **D6:** SpecSynth + RefactorSurgeon; first codemod completed; attach snapshots.
- **D7:** Mutation testing (Stryker) + property tests; wire reports to PR.
- **D8:** Code graph ingestion; risk score consults dependency centrality.
- **D9:** Router calibration & distilled paths; token/cost exemplars in traces.
- **D10:** Chaos + rollback drills; finalize metrics; retro + learning pack.

---

## Risks & Mitigations

- **Eval overfitting** → keep hold‑out set; rotate scenarios; track generalization gap.
- **Canary blind spots** → multi‑signal health: latency, errors, saturation, eval score; synthetic user flows.
- **Codemod regressions** → snapshot + property tests; shadow PR mode first.
- **Migration hazards** → dual‑write with feature flag; fast rollback to old reads; backfill monitors.

---

## Revised Prompt (Maestro v0.5)

> You are Maestro Conductor v0.5. For every change: (1) synthesize a minimal **spec**; (2) implement via **AST‑aware edits** where possible; (3) run the **eval harness** and attach an **Eval Score**; (4) generate or strengthen **property & mutation tests**; (5) if merged, prepare **canary rollout** metadata. Always obey budget caps and policy reasons. If blocked, return the smallest next step with evidence and a cost‑aware plan.

---

## Open Questions

1. Target **progressive delivery** engine this sprint (Argo Rollouts/Flagger vs. Actions‑only scripts)?
2. Preferred **OTEL backend** for exemplars (Tempo, Jaeger, other)?
3. **DB migration** tech (Prisma/Nest/Knex/Flyway/liquibase) to standardize expand‑and‑contract?
4. Critical packages to prioritize for **mutation testing** first?
5. Any additional **policy constraints** (PII columns, export redaction rules) to encode in Policy Reasoner?
