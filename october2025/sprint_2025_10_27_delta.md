````markdown
---
slug: sprint-2025-10-27-delta
version: v2025.10.27-d1
cycle: Sprint 26 (2 weeks)
start_date: 2025-10-27
end_date: 2025-11-07
owner: Release Captain (you)
parent_slug: sprint-2025-10-13-charlie
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Repo Maintainer / Arborist
  - Merge & Release Captain
objectives:
  - 'Tenant-grade security: ABAC/RBAC via OPA, step-up auth (WebAuthn/FIDO2), immutable audits with reason-for-access.'
  - 'Edge hardening & throughput: global rate limiting, CDN/edge caching, and circuit-breakers without user-visible errors.'
  - 'Data lifecycle governance: automated retention/purge with dual-control deletes and audit evidence.'
  - 'Resilience: scheduled failover rehearsal + partial region evacuation playbook; verify RTO/RPO in prod-like.'
  - 'FinOps maturity: spot-friendly workers, right-sized autoscaling, and cost anomaly alerts.'
---

# Sprint 26 Plan — Security, Edge, and Data Governance Hardening

Assumes Sprint 24–25 foundations live (progressive delivery, OTEL, SLSA+cosign, EMC migrations, DR smoke). This sprint raises the security/compliance floor and polishes edge performance while preserving rollback.

---

## 0) Definition of Ready (DoR)

- [ ] For any sensitive flow, a **step-up auth** design is documented and flag-protected.
- [ ] All access to production data requires **reason-for-access** capture.
- [ ] Rate limiting thresholds defined per route and tenant class.
- [ ] Retention rules enumerated with legal basis (DPIA ref) and test data ready.

---

## 1) Swimlanes

### A. Security & Governance (OPA + Step-up)

1. **ABAC/RBAC via OPA**: enforce namespace-tenant binding, SA labels, and deny cross-namespace Secret mounts.
2. **Step-up Auth**: WebAuthn/FIDO2 for risky actions (exports, deletes, privileged queries), with audit trail.
3. **Immutable Audit**: append-only audit stream to object storage with Object Lock + retention.

### B. Edge & Performance (Gateway)

1. **Global rate limiting** (per-IP and per-tenant) at ingress; token-bucket with burst.
2. **CDN/Edge caching**: cacheable GETs with correct `Cache-Control`, `ETag`, and `Vary` keys.
3. **Circuit breakers**: outbound limits/timeouts/retries with jitter; graceful degradation toggles.

### C. Data Lifecycle & Compliance

1. **Retention & Purge**: policy-as-code; dual-control deletes; evidence collection.
2. **Access Reviews**: quarterly review pipeline; report in audit store.

### D. Resilience & DR

1. **Region evacuation playbook** and rehearsal in stage.
2. **Backups integrity**: periodic restore + checksum compare; object-lock configuration verified.

### E. FinOps & Autoscaling

1. **Spot-friendly workers** with PDBs and disruption budgets.
2. **Autoscaling tuning**: HPA stabilization & min/max; VPA recommendations.
3. **Budget & anomaly alerts**: monthly budgets and 24h anomaly detection.

### F. Repo Arborist

- Policy directories versioned; ADRs for step-up/authn and retention; CODEOWNERS for policy.

---

## 2) Measurable Goals

- 100% workloads pass OPA constraints (no cross-namespace Secret mounts, no `:latest`, probes/resources set).
- Step-up auth required on 3 high-risk flows; audit entries include **who/what/why/when**.
- ≥ 30% cache hit on eligible GET endpoints; p95 improved ≥ 10% vs Sprint 25 baseline.
- Rate limiting enabled with default caps and per-tenant overrides; zero 5xx during limit events (graceful 429s).
- Retention jobs purge data as policy; dual-control deletes evidence stored.
- Spot pool handles 2-node interruption without SLO breach.

---

## 3) Risk Register

| Risk                                          | Prob | Impact | Mitigation                                             | Owner    |
| --------------------------------------------- | ---: | -----: | ------------------------------------------------------ | -------- |
| Aggressive rate limits throttle legit tenants |    M |      M | Per-tenant overrides, allowlist, gradual rollout       | Platform |
| Step-up friction hurts conversion             |    M |      M | Risk-based prompts; remember-device; UX copy           | Security |
| Object Lock misconfig blocks lifecycle        |    L |      M | Stage dry-runs; dedicated bucket; retention exceptions | Data     |
| Spot interruptions cascade reschedules        |    M |      H | PDBs, priority classes, pre-warmed capacity            | Platform |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-S: Security & Governance

- [ ] OPA-901 — Tenant/namespace ABAC constraint & templates
- [ ] OPA-902 — Deny cross-namespace Secret mounts; require SA labels
- [ ] STEP-911 — WebAuthn step-up for `exports` & `delete` flows
- [ ] AUD-921 — Immutable audit sink (object-lock) + writer service

### EPIC-E: Edge & Performance

- [ ] EDGE-951 — NGINX ingress global/per-tenant rate limits
- [ ] EDGE-952 — CDN/edge caching headers + cache key strategy
- [ ] EDGE-953 — Circuit breaker timeouts/retries with jitter

### EPIC-D: Data Lifecycle & Compliance

- [ ] DATA-971 — Retention/purge jobs (policy-as-code) with dual-control
- [ ] DATA-972 — Access review pipeline + report artifact

### EPIC-R: Resilience & DR

- [ ] DR-981 — Region evacuation playbook + rehearsal
- [ ] DR-982 — Backup/restore integrity test with checksums

### EPIC-F: FinOps & Autoscaling

- [ ] FIN-991 — Spot worker pool + PodDisruptionBudgets
- [ ] FIN-992 — HPA tuning & VPA recommendations
- [ ] FIN-993 — Budgets + anomaly alerts

### EPIC-G: Arborist & Governance

- [ ] GOV-995 — ADRs for step-up & retention; CODEOWNERS for `policy/**`

---

## 5) Scaffolds & Code Stubs

### 5.1 OPA/Gatekeeper — ABAC (tenant/namespace binding)

**Path:** `policy/abac-tenant-namespace.yaml`

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata: { name: require-tenant-binding }
spec:
  match: { kinds: [{ apiGroups: ['apps'], kinds: ['Deployment'] }] }
  parameters:
    labels: ['tenant']
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDenySecretCrossNs
metadata: { name: deny-secret-cross-ns }
spec:
  match: { kinds: [{ apiGroups: [''], kinds: ['Pod'] }] }
  parameters: {}
```
````

### 5.2 OPA/Rego — deny cross-namespace Secret mounts (example)

**Path:** `policy/rego/deny-secret-cross-ns.rego`

```rego
package kubernetes.admission

violation[{
  "msg": sprintf("Secret %v mounted from another namespace", [sname]),
}] {
  input.review.kind.kind == "Pod"
  vol := input.review.object.spec.volumes[_]
  vol.secret.name == sname
  some ns
  ns := input.review.object.metadata.namespace
  # Assume convention: secret name prefixed with namespace e.g. ns-secret
  not startswith(sname, ns)
}
```

### 5.3 Step-up Auth (WebAuthn) — Gateway Hook

**Path:** `services/gateway/src/middleware/stepup.ts`

```ts
import { Fido2Lib } from 'fido2-lib';
const fido = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.WEBAUTHN_RPID,
  rpName: 'Royalcrown',
  challengeSize: 64,
});
export function requireStepUp(action: string) {
  return async (req, res, next) => {
    if (!needsStepUp(req.user, action)) return next();
    // issue challenge and store in session
    const opts = await fido.assertionOptions();
    req.session.challenge = opts.challenge;
    return res.status(401).json({ step_up: true, webauthn: opts, action });
  };
}
function needsStepUp(user: any, action: string) {
  return (
    ['export', 'delete', 'privileged-query'].includes(action) &&
    !user.recentStepUp
  );
}
```

### 5.4 Audit Trail (append-only) Writer

**Path:** `services/audit-writer/main.ts`

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
const s3 = new S3Client({});
export async function writeAudit(event) {
  const ts = new Date().toISOString();
  const id = crypto
    .createHash('sha256')
    .update(JSON.stringify(event) + ts)
    .digest('hex');
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AUDIT_BUCKET,
      Key: `${ts}_${id}.json`,
      Body: JSON.stringify(event),
      ContentType: 'application/json',
      ChecksumSHA256: Buffer.from(
        crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex'),
        'hex',
      ).toString('base64'),
      ObjectLockMode: 'GOVERNANCE',
      ObjectLockRetainUntilDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    }),
  );
}
```

### 5.5 NGINX Ingress — Global & Per-tenant Rate Limits

**Path:** `charts/gateway/templates/ratelimit-config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: ratelimit-config }
data:
  global-ratelimit: '100r/s'
  tenant-default: '20r/s'
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: '100'
    nginx.ingress.kubernetes.io/limit-burst-multiplier: '5'
    nginx.ingress.kubernetes.io/limit-whitelist: '10.0.0.0/8'
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: gateway, port: { number: 80 } } }
```

**Per-tenant (via header `x-tenant`)** — envoy example
**Path:** `charts/gateway/templates/envoy-ratelimit.yaml`

```yaml
# simplified envoy config with descriptors on x-tenant
```

### 5.6 CDN/Edge Cache Headers

**Path:** `services/gateway/src/cache.ts`

```ts
export function cacheable(res, seconds = 300) {
  res.set('Cache-Control', `public, max-age=${seconds}`);
  res.set('Vary', 'Authorization, Accept-Encoding');
}
export function notCacheable(res) {
  res.set('Cache-Control', 'no-store');
}
```

### 5.7 Circuit Breakers (axios/http)

**Path:** `services/*/src/http.ts`

```ts
import axios from 'axios';
import * as rax from 'retry-axios';
const client = axios.create({ timeout: 1500 });
(client as any).defaults.raxConfig = {
  retry: 3,
  noResponseRetries: 2,
  retryDelay: 200,
  backoffType: 'exponential',
  httpMethodsToRetry: ['GET', 'POST'],
};
rax.attach(client);
export default client;
```

### 5.8 Retention/Purge with Dual-Control

**Path:** `policy/retention.yaml`

```yaml
entities:
  session: { ttl_days: 30 }
  audit: { ttl_days: 365 }
  pii_export: { ttl_days: 7 }
```

**Path:** `tools/purge.ts`

```ts
// requires two approvals; writes audit; dry-run supported
```

### 5.9 Terraform — Budgets & Object Lock

**Path:** `infra/aws/billing/budget.tf`

```hcl
resource "aws_budgets_budget" "prod_monthly" {
  name              = "prod-monthly"
  budget_type       = "COST"
  limit_amount      = "3000"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

**Path:** `infra/aws/s3/audit-bucket.tf`

```hcl
resource "aws_s3_bucket" "audit" { bucket = var.audit_bucket }
resource "aws_s3_bucket_object_lock_configuration" "audit" {
  bucket = aws_s3_bucket.audit.bucket
  rule { default_retention { mode = "GOVERNANCE" days = 90 } }
}
```

### 5.10 HPA Stabilization

**Path:** `charts/app/templates/hpa.yaml` (excerpt)

```yaml
spec:
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 300
      policies: [{ type: Percent, value: 100, periodSeconds: 60 }]
    scaleDown:
      stabilizationWindowSeconds: 300
      policies: [{ type: Percent, value: 50, periodSeconds: 60 }]
```

---

## 6) Observability & Alerts

**Prometheus rules** (multi-window error-burn)
**Path:** `charts/monitoring/templates/error-burn.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: error-burn }
spec:
  groups:
    - name: burn.rules
      rules:
        - alert: FastBurn
          expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)) > 0.02
          for: 2m
          labels: { severity: page }
        - alert: SlowBurn
          expr: (sum(rate(http_requests_total{status=~"5.."}[1h])) by (service) / sum(rate(http_requests_total[1h])) by (service)) > 0.01
          for: 15m
          labels: { severity: warn }
```

**Grafana panel addition**: rate limit 429s and cache hit ratio.

---

## 7) Environment Promotions

| Stage | Preconditions                              | Action                                               | Verification                           | Rollback                                    |
| ----- | ------------------------------------------ | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| dev   | OPA policies in dry-run; feature flags off | Deploy OPA/step-up hooks; enable cache headers       | Smoke, traces, 0 regressions           | Revert chart; disable flags                 |
| stage | Canary per gateway; budgets in place       | Enable rate limits 10% traffic; CDN on; audit writer | p95 improved; 429s < 1%; audit written | Disable annotations; rollback ingress       |
| prod  | Stage soak 48h; approvals                  | Ramp rate limits; run region evac rehearsal          | SLO burn stable; no data loss          | Roll back annotations; disable step-up flag |

---

## 8) Acceptance Evidence

- Gatekeeper/OPA reports: 0 denials on compliant workloads; screenshots.
- Audit objects visible with Object Lock & retention metadata.
- Grafana: cache hit ratio, 429 rate, p95 delta ≥ 10% better.
- DR rehearsal timestamps and outcomes.
- Budget emails/anomaly alerts captured.

---

## 9) Calendar & Ownership

- **Week 1**: OPA policies, step-up scaffolds, ingress rate limit dry-run, cache headers, budgets.
- **Week 2**: Stage canary of rate limits/CDN; audit writer live; DR rehearsal; spot pools; release cut.

Release cut: **2025-11-07 (Fri)** with canary 24–48h; rollback scripted.

---

## 10) Issue Seeds (create via `gh issue create`)

- OPA-901/902, STEP-911, AUD-921, EDGE-951/952/953, DATA-971/972, DR-981/982, FIN-991/992/993, GOV-995

---

## 11) Checklists

**Security/OPA**

- [ ] Tenant labels present; Gatekeeper clean
- [ ] Cross-NS secret mounts blocked
- [ ] Step-up prompts trigger on risky flows; audit entries recorded

**Edge**

- [ ] Rate limits enabled; override tested
- [ ] Cache headers correct; hit ratio ≥ 30%
- [ ] Circuit breakers verified; no cascading failures

**Data**

- [ ] Retention jobs executed; evidence stored
- [ ] Dual-control deletes; approvals logged

**Resilience/FinOps**

- [ ] Region evacuation rehearsal completed
- [ ] Spot interruptions handled without SLO breach
- [ ] Budgets & anomaly alerts firing in test

---

_End of Sprint 26 plan._

```

```
