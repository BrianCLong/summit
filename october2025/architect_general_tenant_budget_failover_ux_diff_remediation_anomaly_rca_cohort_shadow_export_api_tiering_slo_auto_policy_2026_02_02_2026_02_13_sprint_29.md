# Architect-General — Tenant Budget Marketplace, Failover UX, Diff Remediation, Anomaly RCA, Cohort Shadowing, Export API Tiering, SLO Auto‑Policy

**Workstream:** Governance at Scale & Ops Intelligence — Switchboard Platform  
**Sprint Window:** 2026-02-02 → 2026-02-13 (10 biz days)  
**Ordinal:** Sprint 29 (Q1’26 cadence)  
**Prime Objective:** Turn controls into _self‑service levers_ and _closed‑loop ops_: tenant budget marketplace, humane failover UX, actionable diff remediation, anomaly RCA helper, cohort traffic shadowing for canaries, export transparency API tiering, and an SLO simulator that auto‑proposes enforceable policy diffs.

---

## 0) Executive Summary

- **Track A (Now‑value):**
  - **Tenant Budget Marketplace** with request/approve flows for quota & residency budgets; signed approvals.
  - **Failover UX** (sub‑region & region) with continuity banner, offline cache, and resume actions.
  - **Diff Remediation Flows**: guided fix/waive with TTL, proofs, and rollback scripts.
  - **Anomaly RCA Helper**: root‑cause panels (change, traffic, infra, policy) with evidence graphs.
  - **Cohort Shadowing**: mirror real traffic (sanitized) to canary; score with no user impact.
- **Track B (Moat):**
  - **Export API Tiering** (rate/size tiers, signed receipts) and **SLO Auto‑Policy** (simulator → policy PR with risk badges).

**Definition of Done:**

- Budget requests/approvals audit‑logged; quotas update hot; denial reasons with guidance.
- Failover UX prevents drop‑offs; session continuity verified; post‑recovery resume jobs executed.
- Diff remediation reduces open diffs ≥50% in staging within 24h; waivers expire automatically.
- RCA helper explains ≥80% of simulated anomalies with top‑2 contributing factors.
- Shadowing increases canary coverage by ≥40% with no elevated error rate.
- Export API tiering enforced; signed receipts verifiable; SLO auto‑policy PRs created with checks.

---

## 1) Objectives & Key Results

**OBJ‑1: Tenant Budget Marketplace**

- **KR1.1** UI to request **quota/rate** and **residency capacity** changes with rationale.
- **KR1.2** Approval workflow (owners, SLAs, e‑sign via cosign of the request blob).
- **KR1.3** Apply changes hot (edge+app) and roll back on breach; evidence archived.

**OBJ‑2: Failover UX (Region/Sub‑Region)**

- **KR2.1** UX banners: “degraded → failing over → recovered”; offline cache for last view; resume actions after recovery.
- **KR2.2** Synthetic journeys verify zero login churn and <3% action drop during drills.

**OBJ‑3: Diff Audit Remediation**

- **KR3.1** Guided actions: replay, patch, ignore (TTL), export proof; all actions audit‑logged.
- **KR3.2** Bulk apply by key prefix/tenant; progress tracking; rollback script generated.

**OBJ‑4: Anomaly RCA Helper**

- **KR4.1** Panels correlate anomaly with recent deploys, policy changes, traffic cohorts, infra events.
- **KR4.2** Confidence score; suggested fix recipes (e.g., widen canary, scale out, revert policy).

**OBJ‑5: Cohort Shadowing**

- **KR5.1** Sanitized request duplicator → canary env; headers mark `x-shadow: 1`.
- **KR5.2** Shadow score contributes up to 30% of canary decision; zero side effects guaranteed.

**OBJ‑6: Export API Tiering + Signed Receipts**

- **KR6.1** Tiers Free/Standard/Regulated with RPS and size caps; 429 + guidance on overage.
- **KR6.2** Receipt (JWS) includes counts, digest, tier, and Rekor UUID if present.

**OBJ‑7: SLO Auto‑Policy PRs**

- **KR7.1** Simulator emits recommended SLO/limit deltas with risk; opens PR with policy diff + tests.
- **KR7.2** Gate blocks merges on “high risk” without owner override; evidence attached.

---

## 2) Work Breakdown & Owners

| #   | Epic    | Issue                                     | Owner   | Acceptance                       | Evidence                |
| --- | ------- | ----------------------------------------- | ------- | -------------------------------- | ----------------------- |
| A   | Budgets | Request/Approve + cosign + hot apply      | AppEng  | PR’d policy diff; cosign receipt | Audit entries, receipts |
| B   | UX      | Failover banners + offline cache + resume | FE      | Drill shows <3% drop             | Synthetic + video       |
| C   | Diff    | Remediation flows + bulk ops              | DataEng | 50% reduction in 24h             | Diff counts, logs       |
| D   | RCA     | Correlator + panels + recipes             | SecEng  | ≥80% explained                   | RCA reports             |
| E   | Shadow  | Duplicator + score + guardrails           | SRE     | No side effects; score in gate   | Gate logs               |
| F   | Export  | Tiering + signed receipts + limits        | DevOps  | 99.9% API SLO                    | Receipts, rate logs     |
| G   | SLO     | Auto‑policy PR bot + checks               | ProdOps | PRs created; merges gated        | PR list, reports        |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Budget Marketplace

**Schema (`db/migrations/20260202_budgets.sql`)**

```sql
create table if not exists budget_requests (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  kind text not null, -- quota|residency
  payload jsonb not null, -- { rps, burst } or { region, size }
  reason text not null,
  status text not null default 'pending',
  created_by text not null,
  created_at timestamptz not null default now(),
  approved_by text, approved_at timestamptz,
  receipt_sig bytea
);
```

**Request UI**

```tsx
// apps/web/src/app/admin/budgets/page.tsx — grid + request modal + approve/reject + receipt viewer
```

**Cosign Receipt (server)**

```ts
// upon approval: sign JSON of request → store signature; present JWS
```

**Hot Apply**

```ts
// pushes to edge limiter and app limiter via config bus; rollback timer if breach
```

### 3.2 Failover UX

**Banner Component**

```tsx
export function FailoverBanner({
  state,
}: {
  state: 'degraded' | 'failing_over' | 'recovered';
}) {
  const copy = {
    degraded: 'Performance degraded — preparing safe failover…',
    failing_over: 'Failing over now — your work is safe.',
    recovered: 'Recovered — resuming real‑time updates.',
  }[state];
  return (
    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
      {copy}
    </div>
  );
}
```

**Offline Cache**

```ts
// Service Worker caches last successful GET responses per region/tenant; background revalidate on recovery
```

**Resume Jobs**

```ts
// queues idempotent POST replays for actions recorded during failover window
```

### 3.3 Diff Remediation

**Actions API**

```ts
// /api/diff/remediate { action: 'replay'|'patch'|'ignore', keys:[...], ttl?:string }
```

**Rollback Script Generator**

```ts
// writes ops/diff/rollback-<ts>.sh using recorded changes, with dry-run and verify steps
```

### 3.4 Anomaly RCA Helper

**Correlator (`ops/rca/correlate.ts`)**

```ts
// joins anomaly with deploys, policies, traffic, infra; outputs contribution scores
```

**UI Panel**

```tsx
// shows waterfall: base → +traffic → +policy → +infra; confidence + recipe buttons
```

**Recipes (`ops/rca/recipes.yaml`)**

```yaml
- id: widen-canary
  when: canary_score<90 && error_rate stable
  action: helm upgrade --set canary.weight=5
- id: scale-out
  when: latency_p95>300 && cpu>70
  action: kubectl scale deploy/switchboard --replicas=+2
```

### 3.5 Cohort Shadowing

**Duplicator**

```ts
// middleware clones sanitized requests to canary with x-shadow=1; excludes POST with side effects unless flagged safe
```

**Scoring**

```ts
// merges shadow success/latency into canary score with weight 0.3; zero penalty if x-shadow only
```

### 3.6 Export API Tiering & Receipts

**Tier Config (`config/export/tiers.yaml`)**

```yaml
free: { rps: 2, size_mb: 10 }
standard: { rps: 10, size_mb: 100 }
regulated: { rps: 5, size_mb: 50, burst: 20, priority: high }
```

**Signed Receipt (JWS)**

```ts
// { manifest_sha, count, bytes, tier, ts } signed; verify CLI provided
```

### 3.7 SLO Auto‑Policy PRs

**Bot (`tools/slo-auto-policy.ts`)**

```ts
// reads simulator output → generates policy diff (OPA YAML/JSON + Helm values) → opens PR with checklists
```

**PR Template**

```md
# SLO Auto‑Policy Proposal

- Risk score: {{risk}}
- Changes: …
- Evidence: links to sim output, dashboards
```

**Check**

```yaml
- name: Verify policy diff
  run: opa eval -i sample_input.json -d policies -f pretty 'data.switchboard'
```

---

## 4) Test Strategy

- **Unit:** budget request validators; receipt signature; offline cache; remediation safety; RCA correlator math; shadow duplicator filters; receipt verifier; PR bot diff.
- **Integration:** hot apply quotas; failover drills with resume; bulk remediation; RCA explanations; shadow scoring in gate; tier limits; auto‑policy PR checks.
- **Security:** sign receipts; deny dangerous shadowing; remediation authz; export tier abuse rate‑limit; PR bot uses least‑privilege token.
- **Performance:** banner + offline cache TTI < 100ms; bulk remediation 1k keys < 2m; RCA run < 30s; duplicator overhead < 5ms.

---

## 5) Acceptance Checklist (DoR → DoD)

- [ ] Budgets marketplace live; approvals signed; hot apply + rollback safe.
- [ ] Failover UX deployed; continuity verified in drill; resume jobs executed.
- [ ] Diff remediation reduces open diffs ≥50% in 24h; waivers expire.
- [ ] RCA helper explains ≥80% of seeded anomalies; recipes safe to apply.
- [ ] Shadowing increases canary coverage ≥40% without side effects.
- [ ] Export API tiers enforced; signed receipts verifiable.
- [ ] SLO auto‑policy PRs created with checks; risky merges blocked.

---

## 6) Risks & Mitigations

- **Quota gaming** → anomaly watch on quota changes; cooling‑off windows; receipts required.
- **Failover cache staleness** → obvious banners + timestamp; auto‑refresh on recover.
- **Remediation mis‑patch** → dry‑runs + verify + rollback scripts by default.
- **RCA overfitting** → top‑2 contributors only; require cross‑signal corroboration.
- **Shadow traffic leakage** → strict allow‑list of idempotent routes; redact payloads.

---

## 7) Evidence Hooks

- **Budget receipts digests:** …
- **Failover drill video:** …
- **Diff remediation delta chart:** …
- **RCA explanation reports:** …
- **Shadow score contribution:** …
- **Export receipt sample:** …
- **Auto‑policy PR links:** …

---

## 8) Backlog Seed (Sprint 30)

- Budget marketplace pricing & credits; end‑user failover wizard; auto‑remediation for diff exceptions; RCA “explain to user” blameless notes; progressive shadowing to prod cohorts; export API usage analytics; SLO auto‑policy approval workflows with attestations.
