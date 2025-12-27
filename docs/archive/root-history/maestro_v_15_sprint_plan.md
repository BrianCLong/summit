# Maestro Conductor v1.5 Sprint Plan

## “Autonomous Program Director” — Optimize • Experiment • Self‑Heal

**Sprint length:** 10 working days  
**Owners:** Platform (Build/Infra), Agents, SEI, Security/Governance, DX  
**Baseline (from v1.4):** 180 auto‑PRs/wk · LLM $/PR ≤ $0.33 · Eval p95 ≥ 0.947 · Policy Simulator Gate live · Program OKR budgeting · TraceMesh (spec→test→evidence)

### Sprint Goal

Evolve Maestro from self‑governing to **autonomously directing the engineering portfolio**. We add a multi‑objective optimizer for OKRs/budgets, guarded sequential experiments, runtime **SpecLive** monitors, and self‑healing rollouts—while pushing cost/latency lower.

---

## Success KPIs (targets vs. v1.4)

| Area        | Target                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| Agentic Dev | ≥ **200** autonomous PRs/week; reviewer overrides < **1.0%**                       |
| Quality     | Eval p95 ≥ **0.950**; robustness Δ ≤ **2%**                                        |
| Safety      | Invariant + SpecLive coverage ≥ **98%** on critical flows; **0** Sev‑1 regressions |
| Cost        | LLM **$/PR ≤ $0.28**; cache hit ≥ **96.5%**; CI/CD compute/PR ↓ **10%**            |
| Program     | Value‑weighted throughput + **35%**; idle budget < **2%**                          |
| Experiments | Sequential‑gated rollouts: false‑promotion **<1%**, auto‑rollback MTTR ≤ **7 min** |
| DevEx       | Reviewer time ↓ **50%**; Repro Pack ≤ **9s**                                       |

---

## Epics, Stories & Acceptance

### 1) Multi‑Objective Program Optimizer (OKRs • $ • Carbon)

**Epic:** Choose _what to do next_ using an optimizer that balances OKR impact, dollars, and carbon under policy.

- **O1. Objective Model & Normalization**  
  _Utility(u) = w₁·OKR_gain + w₂·$‑savings + w₃·carbon‑reduction, all 0..1 scaled._  
  **Acceptance:** utility model peer‑reviewed; retrospective correlation ≥ 0.7.

- **O2. Pareto Planner (NSGA‑II lite)**  
  _Generate Pareto frontier of plans; pick knee point; export schedule to Release Train._  
  **Acceptance:** value throughput +35% with idle budget <2%.

- **O3. Policy‑Aware Constraints**  
  _OPA‑checked constraints for residency, model caps, security posture._  
  **Acceptance:** 0 policy violations; human‑readable reasons on pruning.

**NSGA‑II (TypeScript skeleton)**

```ts
// services/program/nsga.ts
export type Plan = { id: string; actions: number[] };
export type Fitness = { okr: number; cost: number; carbon: number };
export function dominates(a: Fitness, b: Fitness) {
  return (
    a.okr >= b.okr &&
    a.cost <= b.cost &&
    a.carbon >= b.carbon &&
    (a.okr > b.okr || a.cost < b.cost || a.carbon > b.carbon)
  );
}
export function paretoFront(F: Fitness[]) {
  return F.map((fa, i) => ({
    i,
    dom: F.filter((fb, j) => i !== j && dominates(fb, fa)).length,
  }))
    .filter((x) => x.dom === 0)
    .map((x) => x.i);
}
```

---

### 2) Guarded Experiments: Sequential Tests & Shadow Metrics

**Epic:** Promote only when evidence is overwhelming, roll back instantly when not.

- **E1. Sequential Probability Ratio Test (SPRT) Gate**  
  _Monitor canary vs. control for latency/error; stop early when H₁ or H₀ reached._  
  **Acceptance:** <1% false promotions; average sample size ↓ 40% vs. fixed N.

- **E2. Shadow Metrics Diff**  
  _Trace mirroring + diff; attach to Decision Card; gate on significant deltas._  
  **Acceptance:** no regressions reach 100% traffic.

**SPRT gate (Node script)**

```ts
// services/exp/sprt.ts
export function sprt(
  successA: number,
  totalA: number,
  successB: number,
  totalB: number,
  p0 = 0.99,
  p1 = 0.995,
  alpha = 0.05,
  beta = 0.1,
) {
  const A = Math.log((1 - beta) / alpha),
    B = Math.log(beta / (1 - alpha));
  const ll = (s: number, t: number, p: number) =>
    s * Math.log(p) + (t - s) * Math.log(1 - p);
  const L =
    ll(successA, totalA, p1) -
    ll(successA, totalA, p0) +
    (ll(successB, totalB, 1 - p1) - ll(successB, totalB, 1 - p0));
  return L > A ? 'accept' : L < B ? 'reject' : 'continue';
}
```

---

### 3) SpecLive — Runtime Assertions from Spec Cards

**Epic:** Compile Spec Cards → lightweight runtime guards with trace IDs; record exemplars.

- **S1. Spec→Guard Compiler**  
  _Given/When/Then → pre/post conditions; attach to endpoints & tasks._  
  **Acceptance:** coverage ≥98% on critical paths; overhead < 1% p95.

- **S2. Evidence Link**  
  _Spec IDs propagate to traces and Evidence Bundle._  
  **Acceptance:** one‑click from failing SpecLive to code & tests.

**SpecLive decorator (TypeScript)**

```ts
// server/speclive/guard.ts
export function whenThen(
  when: (ctx: any) => boolean,
  then: (ctx: any) => boolean,
) {
  return (_: any, __: string, desc: PropertyDescriptor) => {
    const f = desc.value;
    desc.value = async function (ctx: any, ...rest: any[]) {
      if (when(ctx)) {
        const res = await f.apply(this, [ctx, ...rest]);
        if (!then({ ctx, res }))
          throw new Error('SpecLiveViolation: THEN failed');
        return res;
      } else {
        return f.apply(this, [ctx, ...rest]);
      }
    };
    return desc;
  };
}
```

---

### 4) Agent Cooperation 6.0 — Postconditions & Auto‑Remediation

**Epic:** Agents must _prove_ they met the goal; if not, they repair themselves.

- **A1. Postcondition Contracts**  
  _Each plan node declares measurable postconditions (tests pass, perf budget, risk cap)._  
  **Acceptance:** 100% agent PRs show contract & measured results.

- **A2. Auto‑Remediation Loop**  
  _On failure, open fix PR with minimal patch or escalate to safe fallback._  
  **Acceptance:** ≥70% failures self‑resolved within 24h.

**Contract schema (JSON)**

```json
{
  "id": "node-impl-42",
  "post": {
    "tests": "pass",
    "perf_p95_ms": { "lt": 250 },
    "risk": { "lt": 0.65 }
  }
}
```

---

### 5) Build & Integration: Remote Exec Pools • SBOM Drift Gate v2

**Epic:** Faster builds, stronger supply chain assurance.

- **B1. Remote Exec Pools**  
  _Regional pools with warm images; cost/carbon aware selection._  
  **Acceptance:** CI p95 ↓ 12%; job start ↓ 35%.

- **B2. SBOM Drift Gate v2**  
  _Diff vs. last green; block on risky transitive bumps; auto‑PR safer alternatives._  
  **Acceptance:** time‑to‑remediate criticals ≤ 1d.

**SBOM drift (Node)**

```ts
// tools/supply/drift.ts
export function riskyDelta(prev: any, next: any) {
  const added = next.packages.filter(
    (p: any) => !prev.packages.some((q: any) => q.purl === p.purl),
  );
  return added.filter(
    (p: any) =>
      p.license?.match(/GPL|AGPL/i) || p.vuln?.severity === 'critical',
  );
}
```

---

### 6) SEI v4 — Causal Impact & Drift Watch

**Epic:** Prove _why_ metrics moved and alert when behavior drifts.

- **I1. Causal Impact (Bayesian)**  
  _Estimate PR impact on key metrics vs. counterfactual baseline; attach to Decision Card._  
  **Acceptance:** causal summaries on 100% risky PRs; reviewer agrees ≥80%.

- **I2. Drift Watch**  
  _Detect distribution shift in inputs/outputs for hot modules; open stabilization PRs._  
  **Acceptance:** 0 silent drifts for 30 days.

**Simple drift test (TS)**

```ts
// services/sei/drift.ts
export function psi(p: number[], q: number[]) {
  return (
    0.5 *
    (p.reduce((s, pi, i) => s + pi * Math.log(pi / q[i]), 0) +
      q.reduce((s, qi, i) => s + qi * Math.log(qi / p[i]), 0))
  );
}
```

---

### 7) DevEx: Decision Center & One‑Click Commands (jQuery)

**Epic:** Review and act without leaving the PR.

- **D1. Decision Center Overlay**  
  _Unifies Decision Cards, SpecLive status, experiment state; inline actions._  
  **Acceptance:** reviewer time ↓ 50%; adoption ≥ 85%.

- **D2. One‑Click Commands**  
  _Retry with alt arm, escalate tests, open rollback, file auto‑remediation PR._  
  **Acceptance:** all actions logged with provenance.

**Single‑file overlay (jQuery)**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Decision Center</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <style>
      #dock {
        position: fixed;
        right: 16px;
        top: 16px;
        width: 380px;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 10px;
        background: #fff;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
      }
      .k {
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <div id="dock">
      <div><b>Decision Center</b></div>
      <div id="body"></div>
      <div>
        <button id="b1">Retry (alt arm)</button>
        <button id="b2">Escalate tests</button>
        <button id="b3">Rollback</button>
      </div>
    </div>
    <script>
      $(function () {
        function render(c) {
          $('#body').html(
            '<div><span class=k>arm</span> ' +
              c.arm +
              ' · <span class=k>eval</span> ' +
              c.eval.toFixed(2) +
              ' · <span class=k>$</span>' +
              c.cost.toFixed(2) +
              '</div><div class=k>speclive: ' +
              (c.speclive ? 'ok' : 'violations') +
              ' · exp: ' +
              c.exp +
              '</div><pre>' +
              c.rationale +
              '</pre>',
          );
        }
        var card = {
          arm: 'impl@small',
          eval: 0.95,
          cost: 0.17,
          speclive: true,
          exp: 'continue',
          rationale: 'Cheapest capable; SPRT not conclusive yet',
        };
        render(card);
        $('#b1').on('click', () =>
          $.post('/api/decision/alt', { arm: 'impl@medium' }),
        );
        $('#b2').on('click', () =>
          $.post('/api/decision/tests', { mode: 'high' }),
        );
        $('#b3').on('click', () =>
          $.post('/api/release/rollback', { rc: 'current' }),
        );
      });
    </script>
  </body>
</html>
```

---

## Definition of Done (v1.5)

- Program optimizer (Pareto) selects plans under OKR/$/carbon; idle budget <2%; throughput +35% by value.
- SPRT gate + shadow metric diffs prevent false promotions; MTTR ≤7m.
- SpecLive runtime guards cover ≥98% critical flows with <1% overhead; Evidence links complete.
- Agent postcondition contracts + auto‑remediation loop resolve ≥70% failures within 24h.
- Remote exec pools speed CI (p95 ↓12%); SBOM drift v2 blocks risky bumps and opens safer PRs.
- SEI v4 causal impact + drift watch in place; no silent drift escapes.
- Decision Center overlay widely adopted; reviewer time ↓50%.

---

## Day‑by‑Day Plan (10 days)

- **D1:** Objective model + NSGA‑II skeleton; policy constraint hooks.
- **D2:** Pareto planner wiring → Release Train; dashboards.
- **D3:** SPRT gate + data plumb; shadow diff tile on PRs.
- **D4:** SpecLive compiler; decorators on hot paths; Evidence links.
- **D5:** Postcondition contracts; auto‑remediation loop MVP.
- **D6:** Remote exec pools; SBOM drift v2; first auto‑PR.
- **D7:** Causal impact estimator; drift watch; alerts.
- **D8:** Decision Center overlay + one‑click actions.
- **D9:** Hardening; chaos/rollback drills; perf pass.
- **D10:** Lock metrics; retro + learning pack.

---

## Team Checklist

- [ ] Pareto plan chosen; schedule exported
- [ ] SPRT in canaries; false‑promotion <1%
- [ ] SpecLive ≥98% coverage on critical flows
- [ ] Postcondition contracts attached to all agent PRs
- [ ] SBOM drift v2 enforced; auto‑PRs active
- [ ] Causal impact + drift watch live
- [ ] Decision Center overlay adopted (≥85%)

---

## Revised Prompt (Maestro v1.5)

> You are Maestro Conductor v1.5. Optimize **what to do next** using a Pareto planner over OKR impact, dollars, and carbon under policy constraints. For every change: (1) run **SPRT‑guarded canaries** with shadow metric diffs; (2) enforce **SpecLive** runtime assertions; (3) attach **postcondition contracts** and self‑remediate on failure; (4) verify supply‑chain diffs; (5) publish a Decision Center card with causal impact and reasons. Prefer the smallest sufficient model/build/test to meet safety and quality.

---

## Open Questions

1. Confirm OKR weights (w₁/w₂/w₃) for the optimizer; any program‑level hard constraints?
2. Metrics to guard in SPRT (latency p95, error rate, cost/req, carbon)?
3. Which endpoints/modules to prioritize for **SpecLive** this sprint?
4. SBOM risk heuristics to treat as blocking vs. warn?
5. Do we export \*\*Decision Ce
