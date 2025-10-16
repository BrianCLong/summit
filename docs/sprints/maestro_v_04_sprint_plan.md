# Maestro Conductor v0.4 Sprint Plan

## “Align & Automate” — Autonomous Release Train

**Sprint length:** 10 working days  
**Owners:** Platform (build/infra), AI Agents, SEI (Software Engineering Intelligence)  
**Baseline (from v0.3):** CI p95 14.2m · PR lead time 12.4h · LLM $/PR $3.45 · Flake 1.2% · Agent success 85%

### Sprint Goal

Scale from fast CI and first‑gen agents to a **risk‑aware, cost‑optimized, self‑healing automation** that merges safe PRs and ships on a schedule with high confidence.

---

## Success KPIs (targets vs. v0.3)

| Area        | Metric (target)                                                      |
| ----------- | -------------------------------------------------------------------- |
| CI/CD       | p95 wall‑clock ↓ **25%** (to ≤ 10.6m); cache hit rate ≥ **85%**      |
| Testing     | Flake rate < **0.5%**; dynamic sharding saves ≥ **40%** time         |
| Agentic Dev | ≥ **20** autonomous PRs merged/week; reviewer override < **10%**     |
| Cost        | LLM **$/PR ↓ 35%** (≤ **$2.24**); prompt‑cache hit rate ≥ **60%**    |
| Risk        | PR Risk Score A/B: **FN=0**; **FP < 15%**                            |
| Security    | SLSA provenance on artifacts; **0** criticals (CodeQL/Semgrep/Grype) |
| DevEx       | `dev up` < **2 min**; preview env TTL cleanup **100%**               |

---

## Workstreams, Stories & Acceptance

### 1) Build & Integration at Scale

**Epic:** Deterministic, incremental builds with selective test execution and strong supply‑chain provenance.

- **B1. Incremental Task Graph (Turborepo/Nx) + Affected‑Only Tests**  
  _Implement project graph; run only affected build/test tasks based on dependency tracing._  
  **Acceptance:** CI p95 ↓ 25%; affected‑only coverage ≥ 95%; artifacts cached per target.

- **B2. Dynamic, Time‑Balanced Test Sharding**  
  _Historical timing file → allocate Jest/Pytest shards to equalize wall‑time._  
  **Acceptance:** p95 test stage ↓ 40%; shard skew < 10%; timings refreshed nightly.

- **B3. SLSA/Supply Chain: Sign & Attest**  
  _`docker buildx` + Cosign sign/attest; SBOM via Syft; block merges on missing attestations._  
  **Acceptance:** All release images signed; provenance+SBOM attached; CI gate enforces.

- **B4. Merge Queue Hardening**  
  _Batch tests with rebase+serialize; auto‑bisect failing batch._  
  **Acceptance:** First‑attempt green merges ≥ 97%; auto‑bisect artifacts attached to PR.

**Engineering Tasks (snippets)**

```yaml
# .github/workflows/affected.yml (skeleton)
name: affected
on: [pull_request, push]
jobs:
  affected:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Compute affected
        run: pnpm turbo run build,test --filter=...[HEAD] --cache-dir=.turbo
      - name: Store timings
        run: node scripts/collect-timings.js > ci/test-timings.json
```

---

### 2) Agent Cooperation 2.0 (Reflect → Critique → Fix)

**Epic:** Multi‑agent reflection, cached reasoning, and an evidence‑first gate.

- **A1. Critic & Fixer Agents + Reflective Loop**  
  _Planner → Implementer → **Critic** (static checks, risk score, diff summary) → **Fixer** (patch) → Tester → Reviewer._  
  **Acceptance:** ≥ 75% agent PRs pass without human edits; risk score posted to PR.

- **A2. Semantic Memory & Prompt Cache**  
  _Normalize prompts; Redis cache; RAG over repo/docs; cheapest capable model first._  
  **Acceptance:** prompt‑cache hit ≥ 60%; LLM $/PR ≤ $2.24.

- **A3. Capability Router + Budget Downshift**  
  _Route tool/model by task complexity & residual budget; emit rationale to telemetry._  
  **Acceptance:** 100% budget overruns prevented; router decisions visible in logs.

**Engineering Tasks (snippets)**

```ts
// server/ai/router.ts (budget-aware model pick)
export function pickModel(
  { tokens, risk }: { tokens: number; risk: number },
  remainingUSD: number,
) {
  if (remainingUSD < 0.1) return 'small';
  if (risk > 0.7 || tokens > 20_000) return 'large';
  if (risk > 0.4) return 'medium';
  return 'small';
}
```

```yaml
# prompts/critic.v1.yaml
meta:
  id: critic@v1
  purpose: 'Summarize semantic diff, compute risk, and propose tests'
guardrails:
  - 'Do not approve missing tests for changed logic.'
  - 'Never include license-incompatible code.'
outputs:
  - risk_score: float
  - summary: markdown
  - suggested_tests: list
```

---

### 3) DevOps & DevEx (Golden Path)

**Epic:** Instant dev environments, rock‑solid previews, and visible performance.

- **D1. One‑Command Dev (`dev up`) + Devcontainer**  
  **Acceptance:** Fresh machine → running stack < 2 minutes; OTEL endpoint auto‑wired.

- **D2. Ephemeral Preview Envs with TTL & Cost Tags**  
  **Acceptance:** 100% cleanup; per‑PR cost tagging (`pr:<id>`); QA link posted within 5 minutes.

- **D3. OTEL RED Metrics & Exemplars**  
  _Trace API & agents; surface rate/errors/duration; link exemplars to PR and budget decisions._  
  **Acceptance:** Dashboards show top slow spans + savings from downshifts.

---

### 4) Software‑Engineering Intelligence (SEI) & Learning PM

**Epic:** Evidence‑driven merges and continuous improvement loops.

- **S1. Maestro PR Risk Score (calibrated)**  
  _Signals: LOC delta, churn, ownership, dependency centrality (graph), coverage delta, complexity, static alerts, test fail rate._  
  **Acceptance:** AUC ≥ 0.80 on historical label set; reviewer required if score ≥ 0.70.

- **S2. PR Health Bot v2**  
  _Comment includes risk, cost‑to‑date, cache hits, flake probability, missing tests, security findings, policy reasons._  
  **Acceptance:** ≥ 95% PRs annotated; reviewer time ↓ 20%.

- **S3. Weekly Learning Pack v2**  
  _Auto‑suggest top‑3 process improvements; opens issues with evidence bundles._  
  **Acceptance:** ≥ 3 improvements accepted each retro.

**Risk score function (TS)**

```ts
export function riskScore(s: {
  locChanged: number;
  churn30d: number;
  filesTouched: number;
  ownersTouched: number;
  depCentrality: number;
  coverageDelta: number;
  complexityDelta: number;
  staticAlerts: number;
  testFailRate: number;
}) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const w = {
    loc: 0.1,
    churn: 0.12,
    files: 0.08,
    owners: 0.08,
    dep: 0.18,
    cov: 0.14,
    cplx: 0.12,
    alerts: 0.1,
    fail: 0.08,
  };
  const z =
    w.loc * clamp(s.locChanged / 800) +
    w.churn * clamp(s.churn30d / 2000) +
    w.files * clamp(s.filesTouched / 25) +
    w.owners * clamp(s.ownersTouched / 6) +
    w.dep * clamp(s.depCentrality) +
    w.cov * clamp((0 - s.coverageDelta) / 0.1) +
    w.cplx * clamp((s.complexityDelta + 1) / 2) +
    w.alerts * clamp(s.staticAlerts / 10) +
    w.fail * clamp(s.testFailRate);
  return +z.toFixed(3);
}
```

---

## Security, Policy & Governance

- **Policy DSL with human‑readable reasons** (allow/deny rules for paths, actions, license policy).  
  **DoD:** All blocks carry a reason; override path recorded in provenance.
- **CodeQL + Semgrep + Secret Scan** (pre‑commit + CI).  
  **DoD:** No secret leaks; noisy alerts < 3% after tuning.
- **Provenance Everywhere** (SBOM + attestations attached to releases and PR artifacts).

**Policy rules (YAML)**

```yaml
# policy/rules.yaml
allow:
  - path: 'server/**'
    actions: ['read', 'write']
deny:
  - path: 'infra/**'
    actions: ['write']
    reason: 'Infra changes require human review.'
deps:
  deny:
    - pattern: '/.*GPL.*/i'
      reason: 'GPL-licensed deps violate distribution policy.'
models:
  max_usd_per_pr: 3.00
  max_prompt_tokens: 60000
```

---

## Definition of Done (v0.4)

- Incremental build graph live; dynamic sharding stable; SLSA attestations enforced.
- Agents include Critic/Fixer; capability router + prompt cache; evidence bundle (risk, diffs, tests, SBOM) attached to PRs.
- PR Health Bot posts with risk & cost; RED/OTEL dashboards show performance + downshift savings.
- Policy DSL enforced with reasons; Semgrep/CodeQL/secret scans pass; LLM $/PR ≤ **$2.24**.
- `dev up` spins the full stack in < **2 minutes** on a fresh machine.

---

## Risks & Mitigations

- **Cache poisoning / stale artifacts** → content‑addressed cache keyed by lockfile+env; periodic bust; CI probes.
- **LLM cache drift** → cache key = normalized prompt + model + repo rev; TTL + golden tests.
- **Over‑blocking policy** → staged rollout (observe→warn→enforce); fast override with justification & audit log.
- **Sharding skew/flake masking** → rotate test ordering; flake radar cross‑checks; nightly full run on main.

---

## Day‑by‑Day Plan (10 days)

- **D1–2:** Turborepo/Nx; affected‑only tasks; seed `ci/test-timings.json`.
- **D3–4:** Sharding live; Cosign sign/attest; merge‑queue bisect.
- **D5–6:** Critic/Fixer agents; capability router; prompt cache.
- **D7:** PR Health Bot v2; risk score wired; cost & cache stats surfaced.
- **D8:** Policy DSL integration; Semgrep/CodeQL tuned; secret scan pre‑commit.
- **D9:** Preview env TTL & cost tags; `dev up` polish; dashboards finalized.
- **D10:** Hardening, chaos drill, retro; lock in metrics.

---

## Team Checklist

- [ ] `affected` CI workflow merged and required
- [ ] Test timing collector producing stable JSON
- [ ] Cosign keys/OIDC configured; attestation gate in place
- [ ] Critic/Fixer agents produce patch + rationale
- [ ] Prompt cache hit rate chart on Grafana
- [ ] PR Health Bot v2 commenting on 95%+ PRs
- [ ] Policy rules validated; override workflow live
- [ ] `dev up` < 2 minutes on clean machine

---

## Revised Prompt (Maestro v0.4)

> You are Maestro Conductor v0.4. Optimize for **safe, cheap, and fast autonomous merges**. Use the Planner→Implementer→Critic→Fixer→Tester→Reviewer chain. Enforce policy reasons, budget caps, and provenance. Always attempt (1) affected‑only builds/tests; (2) use the prompt cache and the smallest capable model; (3) attach an evidence bundle (risk score, diffs, test artifacts, SBOM). Output diffs‑only patches, failure analyses, and next‑step suggestions if blocked.

---

## Open Questions (answer inline to finalize configs)

1. Adopt **Turborepo or Nx** for the task graph this sprint?
2. **OTEL backend** preference (Tempo/Jaeger/other)?
3. **Cosign**: keyless (OIDC) vs. key‑based?
4. Dependency policy beyond GPL (e.g., cryptography, telemetry)?
5. Risk gate threshold: start at **0.70** or stage warn=0.60 → enforce=0.75?

---

## Appendix: Minimal Snippets

**Dynamic shard allocator**

```ts
// scripts/allocate-tests.js
const fs = require('fs');
const idx = +process.argv[2],
  total = +process.argv[3];
const t = JSON.parse(fs.readFileSync('ci/test-timings.json', 'utf8'));
const files = Object.entries(t).sort((a, b) => b[1] - a[1]);
const buckets = Array.from({ length: total }, () => ({ t: 0, files: [] }));
for (const [f, s] of files) {
  buckets.sort((a, b) => a.t - b.t);
  buckets[0].files.push(f);
  buckets[0].t += s || 1;
}
console.log(buckets[idx - 1].files.join(' '));
```

**Cosign attestation gate**

```yaml
- name: Verify attestations
  run: cosign verify-attestation --type spdx maestro/conductor:${{ github.sha }}
```
