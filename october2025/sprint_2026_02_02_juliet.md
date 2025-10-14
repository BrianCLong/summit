```markdown
---
slug: sprint-2026-02-02-juliet
version: v2026.02.02-j1
cycle: Sprint 32 (2 weeks)
start_date: 2026-02-02
end_date: 2026-02-13
owner: Release Captain (you)
parent_slug: sprint-2026-01-19-india
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - FinOps Lead
  - Repo Maintainer / Arborist
objectives:
  - "Runtime hardening: container sandboxing (seccomp/AppArmor), minimal base images, and non-root enforcement."
  - "Golden path developer experience: `devcontainer` + make targets; PR→preview insight widgets; <12m p50."
  - "Search & ingest throughput: async batch APIs, idempotency keys, and backpressure-safe clients."
  - "Multi-tenant correctness: per-tenant quotas, noisy-neighbor isolation, and per-tenant SLOs."
  - "Observability depth: DB query-level tracing, cardinality control, and log sampling v2."
  - "Governance maturity: change calendars, freeze/exception automation, and quarterly audit kit v1."
---

# Sprint 32 Plan — Runtime Hardening, Throughput, and Dev Velocity

Builds on Sprint 31 (mTLS, TDM, perf budgets). We tighten runtime security, speed up dev loops, raise ingest/search throughput with safety valves, and formalize tenant isolation.

---

## 0) Definition of Ready (DoR)
- [ ] Baseline threat model updated; target seccomp profiles listed per image.
- [ ] Devcontainer spec draft for top repo(s); local-to-preview parity agreed.
- [ ] Batch ingest contract approved (idempotency, dedupe semantics, retry policy).
- [ ] Tenant quota policy & SLO targets documented.
- [ ] Log sampling policy and cardinality budgets defined per service.

---

## 1) Swimlanes

### A. Runtime Hardening (Security/Platform)
1. **Seccomp/AppArmor** profiles applied; block privileged/NET_RAW by default.
2. **Minimal base images** (distroless/ubi-micro); rootless containers; read-only FS.
3. **Admission policies**: non-root, drop caps, required fsGroup.

### B. Dev Velocity (CI/CD)
1. **Devcontainers** for reproducible local setup; codespaces-ready.
2. **Preview insight widget**: CI comment with preview URL, seed status, trace/link.
3. **Build caching** refinements; shard auto-sizing based on test count.

### C. Throughput: Search/Ingest (Platform/Backend)
1. **Async batch ingest** endpoint with **idempotency keys**.
2. **Client SDK** backpressure & retries with jitter; circuit breakers.
3. **Query profiling** for search; indexes & prepared statements.

### D. Multi-Tenant Controls (Platform/SRE)
1. **Per-tenant quotas** (RPS, concurrent requests, storage) enforced at gateway.
2. **Noisy-neighbor isolation** via priority classes & HPA per-tenant where applicable.
3. **Per-tenant SLOs** (dashboards + burn alerts).

### E. Observability Depth (Obs)
1. **DB spans** with SQL obfuscation; slow query panels.
2. **Cardinality control**: metric relabeling + exemplar sampling.
3. **Log sampling v2**: dynamic rate based on error budget.

### F. Governance (Security/Arborist)
1. **Change calendar** automation + exception workflow refresh.
2. **Quarterly audit kit v1**: evidence collectors, SBOM index, policy versions.

---

## 2) Measurable Goals
- 100% workloads non-root, read-only FS, and pass seccomp/AppArmor policies; 0 pods with `NET_RAW`.
- PR→preview **p50 < 12m** (p95 < 20m) on top repo; preview comment includes URL + seed status.
- Batch ingest achieves **≥ 3×** throughput vs single-record; duplicates ≤ 0.1% with idempotency.
- Tenant quotas live with dashboards; **no cross-tenant interference** during surge test.
- DB traces on top 5 queries; slow query p95 ↓ **≥ 15%**.
- Audit kit produces a single tarball with SBOMs, signatures, policies, and deploy logs.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Seccomp breaks expected syscalls | M | M | Start in audit mode, move to enforce per service | Platform |
| Devcontainer drift from prod | M | M | Use same base image + env vars; preflight check | CI/CD |
| Batch ingest saturates DB | M | H | Throttle, staged rollout, copy-on-write staging table | Backend |
| Quotas block key tenants | L | M | Allowlist + burst credits; observability first | SRE |
| DB spans leak PII | L | H | SQL obfuscation & denylist; sampling | Obs |

---

## 4) Backlog (Sprint‑Scoped)

### EPIC-HARD: Runtime Hardening
- [ ] HARD-4201 — Seccomp profiles per image + audit→enforce
- [ ] HARD-4202 — Non-root, read-only, drop caps; Gatekeeper policy
- [ ] HARD-4203 — Minimal base image migration for 3 services

### EPIC-DEVX: Developer Velocity
- [ ] DEVX-4301 — `.devcontainer` + tasks for top repo
- [ ] DEVX-4302 — Preview insight PR comment (URL, seed, traces)
- [ ] DEVX-4303 — Shard auto-sizer + cache hits report

### EPIC-THRU: Search/Ingest Throughput
- [ ] THRU-4401 — Async batch ingest API + contract
- [ ] THRU-4402 — SDK backpressure & retries
- [ ] THRU-4403 — Search query profiling + index pass

### EPIC-TEN: Multi-Tenant Controls
- [ ] TEN-4501 — Gateway quotas (RPS, concurrency) by tenant tier
- [ ] TEN-4502 — Priority classes & HPA tuning
- [ ] TEN-4503 — Tenant SLO dashboards + burn alerts

### EPIC-OBS: Observability Depth
- [ ] OBS-4601 — DB spans + SQL obfuscation
- [ ] OBS-4602 — Cardinality control and exemplars
- [ ] OBS-4603 — Log sampling v2 (error-budget aware)

### EPIC-GOV: Governance
- [ ] GOV-4701 — Change calendar automation + exceptions
- [ ] GOV-4702 — Quarterly audit kit v1 (pack & upload)

---

## 5) Scaffolds & Snippets

### 5.1 Seccomp & Non-Root (Helm snips)
**Path:** `charts/app/templates/security.yaml`
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: ["ALL"] }
annotations:
  container.apparmor.security.beta.kubernetes.io/app: runtime/default
  seccomp.security.alpha.kubernetes.io/pod: runtime/default
```

### 5.2 Gatekeeper Non-Root Policy
**Path:** `policy/constraints-nonroot.yaml`
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPNoRootUser
metadata: { name: deny-root }
spec:
  match: { kinds: [{ apiGroups: ["apps"], kinds: ["Deployment"] }] }
```

### 5.3 Distroless Base Dockerfile
**Path:** `services/gateway/Dockerfile`
```dockerfile
FROM gcr.io/distroless/nodejs20:nonroot
WORKDIR /app
COPY --chown=nonroot:nonroot dist/ .
USER nonroot
CMD ["server.js"]
```

### 5.4 Devcontainer
**Path:** `.devcontainer/devcontainer.json`
```json
{
  "name": "royalcrown-dev",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": { "ghcr.io/devcontainers/features/node:1": { "version": "20" } },
  "postCreateCommand": "pnpm i",
  "customizations": { "vscode": { "settings": { "terminal.integrated.defaultProfile.linux": "bash" } } }
}
```

### 5.5 Preview Insight PR Comment
**Path:** `.github/workflows/preview-comment.yml`
```yaml
name: preview-comment
on: [pull_request]
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const url = `https://pr-${context.payload.pull_request.number}.stage.example.com`;
            github.rest.issues.createComment({ ...context.repo, issue_number: context.issue.number, body: `🔍 Preview: ${url}\\nSeed: ✅\\nTraces: [link]` });
```

### 5.6 Async Batch Ingest Contract (OpenAPI excerpt)
**Path:** `apis/ingest-batch.yaml`
```yaml
paths:
  /ingest/batch:
    post:
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
      requestBody: { ...array of items... }
      responses:
        '202': { description: accepted, headers: { Idempotency-Key: { schema: { type: string } } } }
```

### 5.7 SDK Backpressure (pseudo)
**Path:** `sdk/ingest/client.ts`
```ts
const limiter = pLimit(8);
async function sendBatch(items){
  return limiter(()=> http.post('/ingest/batch', items, { timeout: 5000 })).catch(backoffRetry);
}
```

### 5.8 Gateway Quotas (NGINX annotations)
**Path:** `charts/gateway/templates/quotas.yaml`
```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "${TENANT_RPS}"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
```

### 5.9 DB Spans (Node + OTEL)
**Path:** `services/docs-api/src/db/otel.ts`
```ts
import { context, trace } from '@opentelemetry/api';
export async function tracedQuery(sql:string, params:any[]){
  const span = trace.getTracer('docs-api').startSpan('db.query');
  span.setAttribute('db.system','postgres');
  span.setAttribute('db.statement', obfuscate(sql));
  try { return await db.query(sql, params); }
  finally { span.end(); }
}
function obfuscate(s:string){ return s.replace(/'.*?'/g, "'?' "); }
```

### 5.10 Audit Kit (collector)
**Path:** `tools/audit-kit.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p out/evidence
cp sboms/* out/evidence/ || true
cp policies/* out/evidence/ || true
cp deploy-logs/* out/evidence/ || true
tar -czf audit-kit-$(date +%Y%m%d).tar.gz out/evidence
```

---

## 6) Observability & Alerts
- **Dashboards**: non-root & read-only compliance, preview latency, batch ingest throughput, tenant quota hit rate, DB slow queries, log cardinality.
- **Alerts**: policy denials spike, PR→preview p50 > 12m (warn), batch ingest backlog growth, quota 429s > 1% for gold tenants, cardinality explosion.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Seccomp in audit; devcontainer merged | Enforce non-root & read-only; batch ingest beta | No crashes; p95 stable; throughput ↑ | Disable policy; revert image |
| stage | Dev soak 24h; quotas configured | Enable tenant quotas; log sampling v2; DB spans | SLOs per-tenant green; slow p95 ↓ | Relax quotas; disable spans |
| prod | Stage soak 48h; approvals | Enforce seccomp/AppArmor; batch ingest rollout | Error budget stable; audit kit uploaded | Rollback policies; gate endpoint |

---

## 8) Acceptance Evidence
- Gatekeeper reports: 100% non-root/read-only; `NET_RAW=0`.
- CI timing: PR→preview p50/p95 before/after.
- Batch ingest TPS vs single ingest; duplicate rate & idempotency proofs.
- Tenant SLO dashboards; surge test with isolation evidence.
- DB trace screenshots; slow p95 reduction.
- Audit kit tarball hash + upload record.

---

## 9) Calendar & Ownership
- **Week 1**: Seccomp audit, devcontainers, batch API skeleton, quotas draft, DB spans.
- **Week 2**: Enforce policies, SDK backpressure, tenant SLO dashboards, log/cardinality controls, release cut.

Release cut: **2026-02-13 (Fri)** with staged rollout + rollback plan.

---

## 10) Issue Seeds
- HARD-4201/4202/4203, DEVX-4301/4302/4303, THRU-4401/4402/4403, TEN-4501/4502/4503, OBS-4601/4602/4603, GOV-4701/4702

---

_End of Sprint 32 plan._
```

