```markdown
---
slug: sprint-2025-11-10-echo
version: v2025.11.10-e1
cycle: Sprint 27 (2 weeks)
start_date: 2025-11-10
end_date: 2025-11-21
owner: Release Captain (you)
parent_slug: sprint-2025-10-27-delta
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - Repo Maintainer / Arborist
objectives:
  - "Multi-region readiness: active/active for stateless services; active/passive for stateful with controlled failover."
  - "Policy-as-code maturity: org-wide OPA bundles with version pinning and staged rollout."
  - "Incident excellence: SLO error-budget policies, on-call runbooks, and postmortem automation."
  - "Data egress controls: tokenized exports, watermarking, and download rate governance."
  - "Developer velocity: ephemeral data sandboxes, faster CI via caching and test shards; <15m median PR→preview."
---

# Sprint 27 Plan — Multi-Region Readiness & Operational Excellence

Assumes Sprints 24–26 are deployed (progressive delivery, SLSA+cosign, EMC migrations, OPA/step-up, edge hardening). This sprint builds multi-region posture, formalizes policies & incidents, and reduces lead time to change.

---

## 0) Definition of Ready (DoR)
- [ ] Services document region-affinity and data locality constraints.
- [ ] Traffic steering/levers (DNS weights, failover policies) are codified in Terraform.
- [ ] CI cache strategy agreed (actions cache, container layer cache, PNPM/Nx/Turbo if applicable).
- [ ] Export flows mapped to tokenization/watermark scheme, with legal sign-off.

---

## 1) Swimlanes

### A. Multi-Region & Networking (Platform/Deploy)
1. **Stateless active/active**: gateway, web, workers with global LB and health checks.
2. **Stateful active/passive**: primary DB + cross-region replica; controlled promotion runbook.
3. **Traffic steering**: Route53/CloudDNS weighted + health; synthetic checks.

### B. Policy-as-Code Maturity (Security/Governance)
1. **OPA bundles** served from artifact registry; versioned and signed; staged rollout (dev→stage→prod).
2. **Policy telemetry** (decision logs) to SIEM; dashboards for denies/allow by policy.

### C. Incident Excellence (SRE)
1. **Error-budget policy** per service (freeze/relax gates when burn high/low).
2. **On-call runbooks** standardized; pager wiring; **postmortem bot** to scaffold reports.
3. **Game days**: cross-region failover + dependency brownout.

### D. Data Egress Controls (Data/Platform)
1. **Tokenized export** endpoints (short-lived signed URLs, scope-bound tokens).
2. **Watermarking** (in-file and in-headers) + download rate limiting.

### E. Developer Velocity (CI/CD)
1. **Build cache** (actions/cache + registry layer cache) and **test sharding** (matrix) for top repos.
2. **Flaky test quarantine** lane with timeouts & retries.
3. **Preview boot time** improvements (lighter images, lazy migrations).

### F. Repo Arborist
- ADRs for multi-region and egress controls; CODEOWNERS for policies and runbooks; stale preview reap verification.

---

## 2) Measurable Goals
- **PR→preview median < 15 minutes** (p50) on top repo; p95 < 25m.
- **Failover rehearsal**: promote replica in stage in **≤ 10 minutes** with zero data loss (RPO ≤ 5 min).
- **OPA bundles** signed + rolled out; 0 policy drift; decision logs searchable < 1 min latency.
- **Export watermark/token** enforced on 100% export flows; download rate cap without 5xx.
- **Error-budget policy** documented and in use; at least 1 postmortem generated via bot.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Global LB misroutes traffic | L | H | Stage rehearsal; TTL short; manual override doc | Platform |
| Policy rollout denies legit deploys | M | M | Staged rollout + dry-run; canary policy set | Security |
| Cache flakiness hides failing tests | M | M | Cache version pins; periodic cold builds | CI/CD |
| Watermark breaks downstream integrations | L | M | Outbound allowlist; negotiation with partners; toggles | Data |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-MR: Multi-Region Readiness
- [ ] MR-1101 — Global LB + health checks for `gateway` and `web`
- [ ] MR-1102 — DB cross-region replica promotion runbook with automation
- [ ] MR-1103 — Synthetic checks + DNS weight flip scripts

### EPIC-PA: Policy-as-Code
- [ ] PA-1201 — OPA bundle build/sign/publish (cosign) pipeline
- [ ] PA-1202 — Gatekeeper/Kyverno pull-from-bundle with version pin
- [ ] PA-1203 — Decision log export → SIEM + dashboards

### EPIC-IX: Incident Excellence
- [ ] IX-1301 — Error-budget policy authoring per service
- [ ] IX-1302 — Pager wiring + escalation map; on-call runbook template
- [ ] IX-1303 — Postmortem bot GitHub Action

### EPIC-DE: Data Egress Controls
- [ ] DE-1401 — Tokenized export endpoints + short-lived signed URLs
- [ ] DE-1402 — Watermarking headers/body; traceable IDs in files
- [ ] DE-1403 — Download rate limiters per-user/tenant

### EPIC-DV: Developer Velocity
- [ ] DV-1501 — CI cache+layer cache; test shard matrices
- [ ] DV-1502 — Flaky test quarantine/deflake lane
- [ ] DV-1503 — Preview boot speed (image slimming + lazy migrations)

### EPIC-GV: Governance
- [ ] GV-1601 — ADRs (multi-region, egress policy)
- [ ] GV-1602 — CODEOWNERS for `policy/**`, `runbooks/**`

---

## 5) Scaffolds & Snippets

### 5.1 Terraform — DNS Weights & Health Checks
**Path:** `infra/aws/route53/weighted.tf`
```hcl
resource "aws_route53_health_check" "gw_us_east" {
  fqdn              = "api.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/ready"
  failure_threshold = 3
  request_interval  = 30
}
resource "aws_route53_record" "gw_weighted" {
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "A"
  set_identifier = "us-east"
  weighted_routing_policy { weight = 50 }
  alias { name = aws_lb.gw_east.dns_name zone_id = aws_lb.gw_east.zone_id evaluate_target_health = true }
}
```

### 5.2 OPA Bundle Builder (CI)
**Path:** `.github/workflows/opa-bundle.yml`
```yaml
name: opa-bundle
on: [push]
jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build bundle
        run: |
          mkdir -p dist && tar -czf dist/policy.tgz policy/rego
      - name: Cosign sign
        uses: sigstore/cosign-installer@v3
      - run: cosign sign-blob --yes --output-signature dist/policy.sig dist/policy.tgz
      - uses: actions/upload-artifact@v4
        with: { name: opa-bundle, path: dist/ }
```

### 5.3 Gatekeeper Pull From Bundle (init container)
**Path:** `policy/gatekeeper-bundle.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: gatekeeper-policy-downloader }
spec:
  replicas: 1
  selector: { matchLabels: { app: gk-bundle } }
  template:
    metadata: { labels: { app: gk-bundle } }
    spec:
      containers:
      - name: fetch
        image: alpine:3
        args: ["/bin/sh","-c","wget -O /pol/policy.tgz $BUNDLE_URL && wget -O /pol/policy.sig $BUNDLE_SIG && cosign verify-blob --signature /pol/policy.sig /pol/policy.tgz && tar -xzf /pol/policy.tgz -C /pol && sleep 3600"]
        volumeMounts: [{ name: pol, mountPath: /pol }]
      volumes: [{ name: pol, emptyDir: {} }]
```

### 5.4 Decision Logs to SIEM (Collector)
**Path:** `policy/decision-log.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: opa-config }
data:
  config.yaml: |
    decision_logs:
      console: false
      service: siem
    services:
      siem:
        url: http://loki:3100/opa
```

### 5.5 Postmortem Bot (GitHub Action)
**Path:** `.github/workflows/postmortem.yml`
```yaml
name: postmortem-bot
on:
  workflow_dispatch:
    inputs:
      incident: { description: "INC-123 link", required: true }
jobs:
  create:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create PM issue
        run: |
          gh issue create --title "Postmortem: ${{ inputs.incident }}" --label incident,postmortem --body-file runbooks/postmortem-template.md
```

### 5.6 Export Token & Watermark (Express)
**Path:** `services/docs-api/src/exports.ts`
```ts
import crypto from 'crypto';
export function issueExportToken(userId:string, scope:string){
  const exp = Math.floor(Date.now()/1000)+600; // 10m
  const payload = JSON.stringify({ sub:userId, scope, exp });
  const sig = crypto.createHmac('sha256', process.env.EXPORT_SECRET!).update(payload).digest('base64url');
  return Buffer.from(payload).toString('base64url')+"."+sig;
}
export function watermarkHeaders(res, userId:string, exportId:string){
  res.set('X-Export-User', userId);
  res.set('X-Export-Id', exportId);
  res.set('X-Export-Timestamp', new Date().toISOString());
}
```

### 5.7 NGINX Download Rate Limits
**Path:** `charts/gateway/templates/download-limits.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: dl-limits }
data:
  limit_rate: "1m" # ~1MB/s default
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: downloads
  annotations:
    nginx.ingress.kubernetes.io/limit-rate: "1048576"
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
```

### 5.8 CI Speedups — Cache & Shards
**Path:** `.github/workflows/ci.yml` (excerpt)
```yaml
    - name: Cache deps
      uses: actions/cache@v4
      with:
        path: |
          ~/.cache/pnpm
          node_modules
        key: pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    - name: Test (sharded)
      strategy:
        matrix: { shard: [1,2,3,4] }
      run: pnpm test --shard ${{ matrix.shard }}/4
```

### 5.9 Preview Speed — Lazy Migrations
**Path:** `charts/app/templates/job-migrate.yaml` (toggle)
```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: migrate-if-needed }
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ghcr.io/your-org/migrator:latest
        args: ["--if-needed"]
      restartPolicy: OnFailure
```

---

## 6) Observability & SLOs
- **Global dashboard**: region split (east/west), cache hit ratio, 429 rate, failover times.
- **SLO burn policy** wires to pager; `SlowBurn/FastBurn` alerts as from prior sprints.
- **Tracer tags**: `region`, `export_id`, `policy_version`.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Policies in dry-run; cache on | Rollout OPA bundles; enable CI caches/shards | No policy drift; CI lead time ↓ | Pin bundle-1; cold build |
| stage | DB replica healthy; DNS weights 50/50 | Active/active stateless; failover rehearsal | RTO ≤ 10m; RPO ≤ 5m | Flip weights; demote |
| prod | Stage soak 48h; approvals | Enable decision logs; ramp egress controls | No 5xx; token/watermark on exports | Disable annotations/flags |

---

## 8) Acceptance Evidence
- CI metrics: median PR→preview before/after.
- Failover timestamps + logs; replica promotion proof.
- Policy bundle signature & version in audit.
- Export samples with watermark headers and token claims.
- Postmortem issue link and action items closed.

---

## 9) Calendar & Ownership
- **Week 1**: OPA bundles/sign; CI caching/shards; export tokens; DNS weights + health checks.
- **Week 2**: Active/active in stage; failover rehearsal; decision logs; postmortem bot; release cut.

Release cut: **2025-11-21 (Fri)** with canary 24–48h; rollback scripted.

---

## 10) Issue Seeds
- MR-1101/1102/1103, PA-1201/1202/1203, IX-1301/1302/1303, DE-1401/1402/1403, DV-1501/1502/1503, GV-1601/1602

---

_End of Sprint 27 plan._
```

