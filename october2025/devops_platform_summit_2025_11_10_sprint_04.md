# Ops & Delivery Orchestrator — Workstream Plan (Sprint 04)

**Slug:** `devops-platform-summit-2025-11-10-sprint-04`  
**Dates:** 2025‑11‑10 → 2025‑11‑21 (2 weeks)  
**Role:** DevOps / CI‑CD / Deployment / Repo Arborist / Merge & Release Captain  
**Environments:** dev → stage → prod; multi‑region (us‑east/us‑west); multi‑edge (CloudFront + Cloudflare)

**Mission:** Operationalize **privacy, governance, and cross‑cloud resilience** on top of active‑active delivery. Add **adaptive autoscaling** tied to error‑budget burn, **advanced bot/fraud mitigation**, and a **schema‑evolution catalog** with migration safety nets.

---

## 0) Context Snapshot (post Sprint 03)

- Active‑active traffic with GA/Route53 and SLO‑aware steering.
- Performance budgets & FinOps policy gates enforceable in CI.
- Paved‑road service template live; contracts + RED/USE dashboards in place.

> Now we close privacy/compliance gaps, add cross‑cloud failover, and make scaling respond to SLOs rather than raw CPU.

---

## 1) Sprint Goal

1. **Privacy by default**: field‑level retention, tokenization at edge, dual‑control deletes enforced end‑to‑end with immutable audits.
2. **Cross‑cloud edge resilience**: dual CDN (CloudFront ↔ Cloudflare) with origin shielding, health‑based steering, and WAF synergy.
3. **SLO‑driven autoscaling**: scale on latency/error burn using KEDA/Prometheus; protect SLOs during surges.
4. **Schema Evolution Catalog**: track migrations with impact, gates, and rollback playbooks.

**Definition of Success:**

- PII never lands unprotected at origin; tokenization verified by synthetic PII tests.
- Edge failover across providers within 60s; zero customer‑visible downtime in staged drills.
- KEDA reacts to error‑budget burn and restores p95 to target in < 5 minutes during load tests.
- All DB migrations logged in catalog with risk tags and automated rollback plans.

---

## 2) Scope (In/Out)

**In**

- Cloudflare + CloudFront multi‑CDN: health checks, failover, shielding, cache rules, WAF and bot management.
- Edge tokenization: workers transform PII fields; vault mapping w/ envelope crypto.
- KEDA autoscaling based on Prometheus queries for p95/err rate; HPA fallback.
- OPA governance for data retention + access (ABAC), OpenFGA for authZ graph.
- Schema‑evolution catalog; migration validation & back‑out scripts.
- DLP checks in CI and at ingress.

**Out (this sprint)**

- Full confidential computing rollout; ML fraud models (seed hooks only).

---

## 3) Deliverables (Merge‑ready Artifacts)

### 3.1 Cross‑Cloud Edge (Terraform)

```hcl
# infra/cloudflare/main.tf
provider "cloudflare" { api_token = var.cloudflare_api_token }

resource "cloudflare_load_balancer" "gw" {
  zone_id = var.zone_id
  name    = "gateway"
  fallback_pool_id = cloudflare_load_balancer_pool.aws_east.id
  default_pool_ids = [cloudflare_load_balancer_pool.aws_east.id, cloudflare_load_balancer_pool.aws_west.id]
  steering_policy  = "random"
  session_affinity = "none"
}

resource "cloudflare_load_balancer_pool" "aws_east" {
  name = "aws-east"
  origins = [{ name = "alb-east", address = aws_lb.east.dns_name, enabled = true }]
  monitor = cloudflare_monitor.http.id
}
resource "cloudflare_load_balancer_pool" "aws_west" {
  name = "aws-west"
  origins = [{ name = "alb-west", address = aws_lb.west.dns_name, enabled = true }]
  monitor = cloudflare_monitor.http.id
}

resource "cloudflare_monitor" "http" {
  type = "https"
  path = "/healthz"
  interval = 15
  retries  = 2
  timeout  = 5
}

# CloudFront distribution as secondary or in tandem with Cloudflare
resource "aws_cloudfront_distribution" "gw" {
  enabled = true
  origins {
    domain_name = aws_lb.east.dns_name
    origin_id   = "alb-east"
    origin_shield { enabled = true, origin_shield_region = "us-east-1" }
  }
  default_cache_behavior {
    target_origin_id       = "alb-east"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"]
    cached_methods         = ["GET","HEAD"]
  }
}
```

### 3.2 Edge Tokenization (Cloudflare Worker)

```js
// edge/workers/tokenize.js
export default {
  async fetch(request, env) {
    const reqClone = request.clone();
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await reqClone.json();
      const tokenized = await tokenize(body, env);
      return fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(tokenized),
      });
    }
    return fetch(request);
  },
};

async function tokenize(obj, env) {
  const map = {};
  const walker = (o) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => {
        if (typeof v === 'object' && v) return [k, walker(v)];
        if (['email', 'ssn', 'phone'].includes(k)) {
          const token = crypto.randomUUID();
          map[token] = v;
          return [k, `tok_${token}`];
        }
        return [k, v];
      }),
    );
  const out = walker(obj);
  await fetch(env.VAULT_URL, {
    method: 'POST',
    body: JSON.stringify(map),
    headers: { Authorization: `Bearer ${env.VAULT_TOKEN}` },
  });
  return out;
}
```

```yaml
# edge/workers/wrangler.toml
name = "tokenize"
main = "tokenize.js"
compatibility_date = "2025-10-01"
[vars]
VAULT_URL = "https://vault.example.com/tokenize"
```

### 3.3 WAF + Bot Mitigation (Cloudflare)

```hcl
# infra/cloudflare/waf.tf
resource "cloudflare_ruleset" "bot" {
  zone_id = var.zone_id
  name    = "bot-mitigation"
  kind    = "zone"
  phase   = "http_request_firewall_custom"
  rules {
    action = "block"
    expression = "(cf.client.bot_score < 30) and not ip.src in {203.0.113.0/24}"
    description = "Block bad bots, allow allowlist"
  }
}
```

### 3.4 SLO‑Driven Autoscaling (KEDA)

```yaml
# infra/k8s/autoscaling/keda-gateway.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: gateway-slo, namespace: gateway }
spec:
  scaleTargetRef:
    name: gateway
  cooldownPeriod: 120
  minReplicaCount: 2
  maxReplicaCount: 40
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        metricName: gateway_duration_p95
        threshold: '1.5' # seconds
        query: |
          histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{job="gateway"}[2m])) by (le))
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        metricName: gateway_err_rate
        threshold: '0.01' # 1%
        query: |
          sum(rate(http_requests_total{job="gateway",status=~"5.."}[2m])) / sum(rate(http_requests_total{job="gateway"}[2m]))
```

### 3.5 OPA Governance — ABAC & Retention

```rego
# policy/opa/abac.rego
package abac

default allow = false
allow {
  input.actor.assurance == "webauthn"
  input.action == "deploy_prod"
  input.resource.env == "prod"
  input.actor.roles[_] == "release-captain"
}
```

```rego
# policy/opa/retention-fields.rego
package retention

violation[msg] {
  input.kind == "SchemaChange"
  input.field.pii == true
  not input.field.retention_days
  msg := sprintf("PII field %v missing retention days", [input.field.name])
}
```

### 3.6 Schema Evolution Catalog

```yaml
# db/catalog/migrations.yaml
- id: 2025-11-10-001-add-user-phone
  service: user
  risk: medium
  pii: true
  retention_days: 365
  rollout: online
  rollback: 'revert 2025-11-10-001'
  owner: '@data'
- id: 2025-11-12-002-reindex-events
  service: events
  risk: low
  rollout: concurrent_index
  rollback: 'drop index concurrently if exists events_ts_idx'
```

```yaml
# .github/workflows/schema-catalog-gate.yml
name: Schema Catalog Gate
on:
  pull_request:
    paths: ['db/migrations/**', 'db/catalog/**']
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate catalog entries
        run: ./db/tools/validate_catalog.sh db/catalog/migrations.yaml
      - name: OPA checks (PII retention)
        run: conftest test --policy policy/opa db/catalog/migrations.yaml
```

### 3.7 DLP Guards (Ingress + CI)

```yaml
# infra/k8s/gateway/dlp-envoyfilter.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata: { name: dlp-gateway, namespace: gateway }
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match: { context: GATEWAY }
      patch:
        operation: INSERT_FIRST
        value:
          name: envoy.filters.http.lua
          typed_config:
            '@type': type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local body = request_handle:body():getBytes(0, request_handle:body():length())
                if body and string.match(body, "[0-9]{3}%-[0-9]{2}%-[0-9]{4}") then
                  request_handle:respond({[":status"] = "422"}, "PII pattern blocked")
                end
              end
```

```yaml
# .github/workflows/dlp-ci.yml
name: DLP Scan (PR)
on: [pull_request]
jobs:
  dlp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Secret/PII scan
        run: gitleaks detect --redact --exit-code 1 --report-format json --report-path dlp.json
      - uses: actions/upload-artifact@v4
        with: { name: dlp-report, path: dlp.json }
```

### 3.8 Release Controls — Reason‑for‑Access

```yaml
# .github/workflows/release-train.yml (snippet)
promote_prod:
  steps:
    - name: Reason for access
      run: |
        echo "reason=${{ github.event.inputs.reason }}" | tee -a audit.log
        test -n "${{ github.event.inputs.reason }}" || (echo "Reason required" && exit 1)
    - name: Sign audit
      run: cosign attest --predicate audit.log --type attestation release:${{ github.ref_name }}
```

---

## 4) Sprint Backlog

### Epic P — Privacy & Governance

- **P1**: Edge tokenization worker + vault integration.
- **P2**: OPA retention checks on schema changes; CI enforcement.
- **P3**: DLP at ingress + CI scanning; redaction logs.

**Acceptance:** Synthetic PII blocked at edge; catalog PR with PII field requires retention; evidence bundle stored.

### Epic Q — Cross‑Cloud Edge Resilience

- **Q1**: Cloudflare LB + monitors + WAF/bot rules.
- **Q2**: CloudFront origin shielding + routing parity.
- **Q3**: Drill: disable Cloudflare/CloudFront alternately → prove 60s failover.

**Acceptance:** Stage drill passes; Grafana shows uninterrupted 2xx during failover.

### Epic R — SLO‑Driven Autoscaling

- **R1**: KEDA ScaledObjects for `gateway`/`web`.
- **R2**: Synthetic surge + recovery in < 5 minutes.
- **R3**: Guardrails: floor/ceiling, cost alerts for runaway scale.

**Acceptance:** k6 surge triggers scale out; p95 recovers; alerts captured.

### Epic S — Schema Evolution & Safety

- **S1**: Catalog structure + validator; tie into migration gate.
- **S2**: Back‑out scripts generated for each risky migration.
- **S3**: Readiness checklist per migration (locks, long tx, size).

**Acceptance:** One medium‑risk migration ships with back‑out verified in stage.

---

## 5) Day‑by‑Day Cadence

- **D1**: Cloudflare LB/WAF/bot, monitors; CloudFront parity.
- **D2**: Worker tokenization + vault API; synthetic tests.
- **D3**: KEDA + PromQL triggers; surge drill.
- **D4**: OPA ABAC + retention policies; schema catalog gate.
- **D5**: DLP EnvoyFilter; CI DLP; redaction dashboard.
- **D6**: Cross‑cloud failover drill, evidence capture.
- **D7**: Migration back‑out rehearsals; finalize runbooks.
- **D8–D10**: Soak, fix, ship, attach acceptance evidence.

---

## 6) Acceptance Evidence to Capture

- Cloudflare & CloudFront configs, monitor logs, failover timestamps; worker tokenization logs + vault attestations; KEDA HPA events; k6 outputs; OPA decision logs; DLP reports; migration catalog diff; rollback demonstration.

---

## 7) Risks & Mitigations

- **Edge token mismatch** → deterministic token option with HMAC; vault TTLs; replay‑safe design.
- **WAF false positives** → start in count, gradually enforce; allowlists for partners.
- **Autoscaling oscillation** → hysteresis, cooldown, and min replicas; tie to burn rate not instantaneous latency.
- **Catalog drift** → pre‑commit hook to require catalog entry for any migration.

---

## 8) Alignment

- _UNIFIED DATA FOUNDATION_: catalog + retention guardrails reduce data risk.
- _TRIAD MERGE_: cross‑cloud edge reduces blast radius during aggressive merges.
- _MAESTRO COMPOSER_: SLO‑driven scale protects user experience during composition spikes.

---

## 9) Runbooks

```md
# RUNBOOK: Cross‑Cloud Edge Failover Drill

1. Announce window; set synthetic load (k6 200 RPS).
2. Disable Cloudflare pool, observe CloudFront carry traffic; verify 2xx continuity.
3. Re‑enable, then disable CloudFront; verify Cloudflare continuity.
4. Reconcile logs; attach evidence to DR_EVIDENCE.md.
```

```md
# RUNBOOK: PII Tokenization Verification

- Send seeded payload with sample PII.
- Confirm edge replaced with tok\_\* in origin logs; vault stores mapping.
- Attempt replay; ensure token remains opaque and cannot de‑tokenize without role.
```

```md
# RUNBOOK: SLO‑Driven Autoscaling

- Start surge; watch KEDA metrics; ensure replicas grow within 2 min.
- Confirm p95 < target within 5 min; review cost impact and rollback if breach persists.
```

---

## 10) Quick‑Start Commands

```bash
# Deploy Cloudflare worker
wrangler deploy edge/workers/tokenize.js

# Apply KEDA resources
kubectl apply -f infra/k8s/autoscaling/keda-gateway.yaml

# Run schema catalog gate locally
conftest test --policy policy/opa db/catalog/migrations.yaml

# Start cross‑cloud drill (stage)
./ci/dr/cross_cloud_failover.sh --env stage --timeout 120
```

---

## 11) Follow‑on Seeds (Sprint 05)

- Confidential computing for PII services (Nitro enclaves/TEE) with remote attestation.
- Fraud signals pipeline (bot scoring + user behavioral fingerprints).
- Self‑healing runbooks (auto‑mitigate top 3 incident classes).
- Data‑in‑use encryption for selective workloads.
