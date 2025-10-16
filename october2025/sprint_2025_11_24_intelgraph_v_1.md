````markdown
# IntelGraph — GA Readiness Sprint (v1.0.0)

**Slug:** `sprint-2025-11-24-intelgraph-v1-0`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-11-24 → 2025-12-05 (10 business days)  
**Theme:** **General Availability & Compliance Audit** — scale to 1M+ nodes, security hardening, billing & quotas, audit/compliance pack, and launch polish.

---

## 0) North Stars & Definition of Done (GA Gate)

- **Scale:** Handle 1M nodes / 5M edges; p95 GraphQL < 900ms; p95 analytics job submit < 400ms.
- **Security:** External pen‑test findings at or below Low; SBOM published; SLSA‑2 build provenance; CIS Benchmarks passed on cluster baseline.
- **Governance:** Complete audit log coverage; retention & redaction enforced; export signing mandatory.
- **Commercial:** Usage metering, org/seat billing, quotas & alerts; TOU/license compliance visible in UI.
- **Supportability:** Runbooks, SLO dashboards, on‑call rotation, incident playbooks, and rollback plans.

**GA Acceptance Demo:**

1. 1M/5M dataset loaded; tri‑pane smooth; NL→Cypher budgeted; analytics overlays cached.
2. Policy deny + appeal; export signed + verified; redaction applied.
3. Billing: org hits quota → graceful degrade; admin buys more seats → features resume.
4. SBOM, audit logs, OPA policies, and SLSA provenance downloadable from Admin.

---

## 1) Epics → Objectives

1. **Scale & Caching (SCL‑E1)** — server tuning, read replicas, query plans, overlay materialization, CDN for tiles.
2. **Security Hardening (SEC‑E2)** — pen‑test remediation, SSRF/XSS guards, CSP, CSRF tokens, signed cookies, dependency review.
3. **Billing & Quotas (BIL‑E3)** — usage meters (queries/jobs/storage), Stripe‑compatible invoices, seat & feature flags, org quotas.
4. **Compliance Audit Pack (CMP‑E4)** — audit log coverage, data retention proofs, export signer enforced, SBOM/SLSA.
5. **UX Polish & Readiness (UX‑E5)** — onboarding checklists, empty‑state guides, latency hints, crash‑free sessions.
6. **Ops & SRE (OPS‑E6)** — HPA, read‑replica routing, backup/restore drills, incident tooling, chaos tests.

---

## 2) Swimlanes

### Frontend (React + MUI + Cytoscape.js + jQuery)

- Query budget coach (inline hints); quota banners; billing admin; OPA policy preview.
- Crash guard & session restore; skeleton loaders; keyboard help overlay.
- Accessibility audit fixes (AA+ contrast, focus traps, ARIA roles).

### Backend (Node/Express + Apollo + Neo4j + Redis)

- Read replica routing; cached overlays table; query plan hints; slow op tracing.
- Billing service (meters, quotas, invoicing hooks); seat/licensing middleware.
- Compliance pack generator (audit export, SBOM, SLSA attestation, policy bundle).

### Ops/SRE & Security

- Grafana panels for quota usage, billing errors, cache hit rate, replica lag; backup drills; chaos experiments.
- CSP/CSRF, SSRF hardening, secret scanning, dependency review gates.

### QA/Docs

- Scale dataset generator; perf runs; pen‑test remediation tracking; launch runbooks; admin/analyst onboarding.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ 95 pts

### Scale & Caching (30 pts)

1. Read‑replica routing with sticky write sessions.  
   **AC:** ≤5% replica lag; read queries prefer replica; failover covered. (**L**)
2. Overlay materialization + cache invalidation.  
   **AC:** Communities/PageRank overlays persisted; invalidation on writes; 95% cache hit in demo flows. (**XL**)
3. Query planner hints & bounded expansions.  
   **AC:** Depth/degree caps; cost hints in UI; p95 < 900ms. (**L**)

### Security Hardening (18 pts)

4. CSP + CSRF + signed cookies + HTTPS‑only.  
   **AC:** No inline‑eval; CSRF tokens on mutations; cookie flags set; tests pass. (**L**)
5. SSRF & dependency review.  
   **AC:** SSRF safelist; axios DNS rebind guard; `npm audit`/`osv-scanner` gates; SBOM generated. (**M**)

### Billing & Quotas (24 pts)

6. Metering: GraphQL ops, analytics jobs, storage.  
   **AC:** Counters per org/user; monthly rollup; backfill script. (**L**)
7. Quotas & feature flags.  
   **AC:** Deny with reason + purchase link; grace window; admin override. (**L**)
8. Invoicing hooks (Stripe‑compatible).  
   **AC:** Webhooks verified; invoice preview; error handling; audit. (**M**)

### Compliance Pack (15 pts)

9. Audit log coverage & export.  
   **AC:** 100% critical events; tamper‑evident hash chain; export as NDJSON. (**M**)
10. SBOM + SLSA provenance publishing.  
    **AC:** CycloneDX JSON; SLSA‑2 attestation attached to container builds. (**M**)

### UX & QA (8 pts)

11. A11y fixes & crash guard/session restore.  
    **AC:** Axe scan clean; unhandled errors captured; restore last view. (**M**)
12. Scale perf tests & chaos.  
    **AC:** 1M/5M run meets SLO; chaos results documented. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Read‑Replica Routing (Apollo/Neo4j)

```ts
// server/src/db/driver.ts
import neo4j from 'neo4j-driver';
const primary = neo4j.driver(
  process.env.NEO4J_PRIMARY!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);
const replica = neo4j.driver(
  process.env.NEO4J_REPLICA!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);
export function session(kind: 'read' | 'write') {
  return (kind === 'read' ? replica : primary).session({
    defaultAccessMode: kind === 'read' ? 'READ' : 'WRITE',
  });
}
```
````

### 4.2 Overlay Materialization

```ts
// server/src/analytics/overlays.ts
export async function materializeCommunityOverlay(
  caseId: string,
  runId: string,
  driver,
) {
  const s = driver.session({ defaultAccessMode: 'WRITE' });
  try {
    await s.run(`MATCH (n:Entity { caseId:$caseId }) WITH n LIMIT 1 RETURN n`); // warmup
    await s.run(
      `CALL gds.graph.project('case-'+$caseId,'Entity','RELATED',{relationshipProperties:'weight'})`,
      { caseId },
    );
    await s.run(
      `CALL gds.leiden.write('case-'+$caseId,{ writeProperty:'community_'+$runId })`,
      { caseId, runId },
    );
    await s.run(`CALL gds.graph.drop('case-'+$caseId)`, { caseId });
  } finally {
    await s.close();
  }
}
```

### 4.3 Cache Invalidation

```ts
// server/src/cache/overlays-cache.ts
import LRU from 'lru-cache';
const overlays = new LRU({ max: 1000, ttl: 1000 * 60 * 15 });
export function getOverlay(key) {
  return overlays.get(key);
}
export function setOverlay(key, val) {
  overlays.set(key, val);
}
export function invalidateOnWrite(entityId) {
  overlays.forEach((_, k) => {
    if (k.includes(entityId)) overlays.delete(k);
  });
}
```

### 4.4 CSP & CSRF

```ts
// server/src/security/headers.ts
import helmet from 'helmet';
export const security = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});
```

```ts
// server/src/security/csrf.ts
import csrf from 'csurf';
export const csrfProtect = csrf({
  cookie: { httpOnly: true, sameSite: 'strict', secure: true },
});
```

### 4.5 Usage Metering & Quotas

```ts
// server/src/billing/meter.ts
import { Counter } from 'prom-client';
export const gqlOps = new Counter({
  name: 'gql_ops_total',
  help: 'GraphQL ops by org',
  labelNames: ['org', 'op'],
});
export function meter(org: string, op: string) {
  gqlOps.labels(org, op).inc();
}

// server/src/billing/quotas.ts
export function checkQuota(ctx, op) {
  const used = getUsage(ctx.org, op);
  const limit = getLimit(ctx.org, op);
  if (used >= limit) throw new Error('QuotaExceeded');
}
```

### 4.6 Billing Hooks (Stripe‑compatible)

```ts
// server/src/billing/webhooks.ts
import crypto from 'crypto';
export function verifyStripeSig(payload: string, sig: string, secret: string) {
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return mac === sig;
}
```

### 4.7 SBOM (CycloneDX) — CI step (GitHub Actions)

```yaml
# .github/workflows/sbom.yml
name: SBOM
on: [push]
jobs:
  cyclonedx:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CycloneDX/gh-node-module-generatebom@v2
        with: { output: 'sbom.json' }
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json }
```

### 4.8 SLSA Provenance (excerpt)

```yaml
# .github/workflows/slsa.yml
name: SLSA
on: [push]
jobs:
  provenance:
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
    with:
      upload-assets: true
```

### 4.9 A11y & Crash Guard (jQuery hooks)

```js
// apps/web/src/ux/jquery-guard.js
$(function () {
  window.addEventListener('error', function (e) {
    localStorage.setItem('lastView', window.location.pathname);
    $('#crash-banner').show().text('We hit a snag. Restoring your last view…');
  });
  const last = localStorage.getItem('lastView');
  if (last) history.replaceState({}, '', last);
});
```

### 4.10 k6 — Scale Perf

```js
import http from 'k6/http';
export const options = { vus: 80, duration: '5m' };
export default function () {
  http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({ query: '{ searchEntities(q:"acme", limit:10){ type } }' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Read‑replica routing, overlay materialization, cache invalidation.
- **D3–D4:** CSP/CSRF/SSRF hardening; SBOM; dependency review.
- **D5–D6:** Metering, quotas, billing hooks; admin UI.
- **D7:** Compliance pack (audit export, SLSA attestation download).
- **D8:** A11y polish, crash guard, skeletons.
- **D9–D10:** Scale perf, chaos, docs, runbooks, GA demo script.

---

## 6) Risks & Mitigations

- **Replica lag** → health checks, fallback to primary, circuit breaker.
- **Cache incoherence** → write‑through patterns, TTLs, invalidation hooks.
- **Quota UX backlash** → clear reasons, grace periods, admin overrides.
- **Compliance drift** → CI gates for audit coverage & SBOM; periodic reviews.

---

## 7) Metrics

- Cache hit rate; replica lag; p95 GraphQL & overlay fetch; quota denials; billing webhook errors; SBOM generation success; a11y violations count; crash‑free sessions.

---

## 8) Release Artifacts

- **ADR‑020:** Overlay materialization & caching.
- **ADR‑021:** Billing architecture & quotas.
- **RFC‑025:** Compliance pack export & admin downloads.
- **Runbooks:** Replica failover; cache purge; quota overrides; biller outage; SBOM/SLSA publishing.
- **Docs:** GA checklist; Admin billing guide; Security hardening guide.

---

## 9) Definition of Ready

- Story has AC, telemetry, threat model, fixtures, owner, reviewer, rollout/rollback.

---

## 10) Demo Script (15 min)

1. Load 1M/5M dataset; graph smooth; analytics overlays instant due to cache.
2. Trigger policy denial → appeal flow; export signed & verified.
3. Hit org quota, observe graceful limits & helpful hints; add seats to resume.
4. Download compliance pack (audit logs NDJSON, SBOM, SLSA); show dashboards.

---

## 11) Out‑of‑Scope (backlog)

- Fine‑grained purpose binding; fully managed multi‑tenant billing; marketplace; edge kits; federated analytics.

```

```
