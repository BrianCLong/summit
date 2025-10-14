# Ops & Delivery Orchestrator — Workstream Plan (Sprint 03)

**Slug:** `devops-platform-summit-2025-10-27-sprint-03`  
**Dates:** 2025‑10‑27 → 2025‑11‑07 (2 weeks)  
**Role:** DevOps / CI‑CD / Deployment / Repo Arborist / Merge & Release Captain  
**Environments:** dev → stage → prod (+ ephemeral previews per PR) with multi‑region (us‑east / us‑west)

**Mission:** Advance from active‑passive to **active‑active** service delivery; codify **performance budgets**, enforce **FinOps policy gates**, and complete **platform self‑service** so teams can ship independently on the hardened runway from Sprints 01–02.

---

## 0) Context Snapshot (post Sprint 02)
- Delivery path is green: CI → Preview → Canary → SLO gates; Terraform gated; sealed‑secrets baseline.  
- DR posture proven on stage (RTO/RPO met); WAF/CDN, Kubecost, autoscaling profiles landed; retention + dual‑control delete wired; migration gate in place.

> We can survive a region loss. Now we operate **both regions live** with clear budgets and guardrails, and make the platform truly self‑serve.

---

## 1) Sprint Goal
1) Serve production traffic from **two regions** concurrently with health‑based traffic steering and surge control.  
2) Enforce **performance budgets** (p95, CPU, memory) and **cost policies** at PR and deploy time.  
3) Deliver **self‑service blueprints**: one‑command service bootstrap (repo → CI → preview → deploy) with paved‑road defaults.

**Definition of Success:**
- 50/50 traffic split across regions; automatic shed/steer within 2 minutes of a single‑region SLO breach.  
- CI blocks merges that exceed perf budget deltas or violate cost policies.  
- A new service is created from a template and reaches stage with zero manual tickets.

---

## 2) Scope (In/Out)
**In**
- Global traffic: AWS Global Accelerator (or Route53 Latency) + health/SLO adaptive weights.  
- Multi‑region rollouts using Argo Rollouts with regional feature flags + surge controls.  
- Perf budgets & regression gates (k6 + Lighthouse/API) + A/B baseline compare.  
- FinOps OPA policies: block out‑of‑budget previews, enforce instance/class/limits.  
- Paved‑road service template (cookiecutter) with CI, Helm, SLOs, alerts, runtime‑class.

**Out (this sprint)**
- Cross‑cloud federation; ML‑driven autoscaling.  
- Full-blown DLP/classification (tracked for Sprint 04).

---

## 3) Deliverables (Merge‑ready Artifacts)

### 3.1 Global Traffic — AWS Global Accelerator (GA)

```hcl
# infra/aws/global-accelerator/main.tf
resource "aws_globalaccelerator_accelerator" "edge" {
  name            = "summit-edge"
  enabled         = true
  ip_address_type = "IPV4"
}

resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.edge.id
  protocol        = "TCP"
  port_range { from_port = 443 to_port = 443 }
}

resource "aws_globalaccelerator_endpoint_group" "east" {
  listener_arn              = aws_globalaccelerator_listener.https.id
  endpoint_group_region     = "us-east-1"
  health_check_path         = "/healthz"
  health_check_interval_seconds = 10
  threshold_count           = 3
  traffic_dial_percentage   = 50
  endpoint_configuration {
    endpoint_id = aws_lb.east.arn
    weight      = 100
  }
}

resource "aws_globalaccelerator_endpoint_group" "west" {
  listener_arn            = aws_globalaccelerator_listener.https.id
  endpoint_group_region   = "us-west-2"
  health_check_path       = "/healthz"
  health_check_interval_seconds = 10
  threshold_count         = 3
  traffic_dial_percentage = 50
  endpoint_configuration {
    endpoint_id = aws_lb.west.arn
    weight      = 100
  }
}
```

> Option: if GA not available, fall back to Route53 Latency + failover health checks (use Sprint‑02 modules).

### 3.2 Adaptive Traffic — SLO‑aware Weights

```yaml
# .github/workflows/adaptive-traffic.yml
name: Adaptive Traffic (SLO‑aware)
on:
  schedule: [{ cron: '*/5 * * * *' }]
  workflow_dispatch: {}
permissions: { contents: read, id-token: write }
jobs:
  adjust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pull SLO metrics
        run: ./ci/slo/pull.sh # writes metrics.json with p95, err, saturation per region
      - name: Compute weights
        run: ./ci/slo/compute_weights.sh metrics.json > weights.json
      - name: Apply weights to GA
        run: ./ci/slo/apply_ga_weights.sh weights.json
```

```bash
# ci/slo/compute_weights.sh (simplified)
jq -r 'def cap(x): if x<0 then 0 elif x>100 then 100 else x end;
  .regions as $r | $r|map({region:.name,score:(100 - (.p95*40 + .err*6000 + .sat*20))}) |
  map({region:.region, weight: cap(.score)})' "$1"
```

### 3.3 Multi‑Region Progressive Delivery

```yaml
# infra/helm/gateway/values-activeactive.yaml
rollout:
  strategy: canary
  steps:
    - setWeight: 10
    - pause: { duration: 5m }
    - setWeight: 50
    - pause: { duration: 10m }
    - setWeight: 100
flags:
  regionOverrides:
    us-east-1: { featureX: true }
    us-west-2: { featureX: false }
```

```yaml
# .github/workflows/deploy-multi-region.yml
name: Deploy • Multi‑Region Canary
on: { workflow_dispatch: { inputs: { version: { required: true } } } }
jobs:
  east:
    runs-on: ubuntu-latest
    environment: prod-us-east-1
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/canary_rollout.sh us-east-1 10 ${{ inputs.version }}
      - run: ./ci/health_gate.sh us-east-1 10m --slo apigw-p95<1500ms err<1%
  west:
    needs: east
    runs-on: ubuntu-latest
    environment: prod-us-west-2
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/canary_rollout.sh us-west-2 10 ${{ inputs.version }}
      - run: ./ci/health_gate.sh us-west-2 10m --slo apigw-p95<1500ms err<1%
```

### 3.4 Performance Budgets & Regression Gates

```yaml
# .github/workflows/perf-budgets.yml
name: Perf Budgets (PR)
on:
  pull_request:
    paths: ["services/**", "gateway/**", "web/**"]
jobs:
  api_benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Spin preview
        run: ./ci/preview_deploy_min.sh ${{ github.event.number }}
      - name: Baseline fetch
        run: ./ci/perf/baseline_pull.sh main services/gateway.yaml
      - name: Run k6 suite
        run: BASE=$PREVIEW_URL k6 run ci/k6/api_suite.js --out json=out.json
      - name: Compare against budgets
        run: ./ci/perf/compare.sh out.json budgets/api.yaml --threshold p95:+10% err:<1%
```

```yaml
# budgets/api.yaml
endpoints:
  - path: /search
    p95_ms: 800
    err_rate: 0.5
  - path: /ingest
    p95_ms: 1200
    err_rate: 1
```

### 3.5 FinOps Policy Gates (OPA + Kubecost)

```yaml
# policy/opa/finops.rego
package finops

violation[msg] {
  input.kind == "PreviewRequest"
  input.namespace =~ /^pr-\d+/
  cost := input.estimated_hourly_cost
  cost > 1.50
  msg := sprintf("Preview exceeds cost cap: $%v/h (cap $1.50/h)", [cost])
}

violation[msg] {
  input.kind == "Workload"
  cpu_req := input.resources.requests.cpu_millicores
  mem_req := input.resources.requests.memory_mb
  cpu_req > 1000
  msg := sprintf("CPU request too high: %vm (cap 1000m)", [cpu_req])
}
```

```yaml
# .github/workflows/finops-gate.yml
name: FinOps Gate (PR)
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  cost_check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Estimate preview cost
        run: ./ci/finops/estimate_preview_cost.sh > finops.json
      - name: OPA policy
        run: conftest test --policy policy/opa finops.json
```

### 3.6 Self‑Service Service Template (Paved Road)

```bash
# tools/new-service.sh
set -euo pipefail
NAME=${1:?service-name}
cookiecutter templates/service -o services/ -f -V name=$NAME
pushd services/$NAME
  git checkout -b feat/$NAME-svc
  ./scripts/init_ci.sh
  ./scripts/init_helm.sh
  ./scripts/init_slo.sh
popd
```

```yaml
# templates/service/.cookiecutter.yaml
default_context:
  ci: github-actions
  language: nodejs
  include_otlp: true
  include_prom: true
  include_rollouts: true
```

### 3.7 Contract/Snapshot Testing for APIs (to curb regressions)

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests (PR)
on:
  pull_request:
    paths: ["api/**", "contracts/**"]
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dredd (OpenAPI) tests
        run: dredd contracts/openapi.yaml $PREVIEW_URL --reporter junit > dredd.xml
      - name: Upload test report
        uses: actions/upload-artifact@v4
        with: { name: contract-report, path: dredd.xml }
```

### 3.8 Observability Enhancements — RED & USE dashboards

```yaml
# infra/k8s/monitoring/gateway-red.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: gateway-red, namespace: monitoring }
spec:
  groups:
    - name: red
      rules:
        - record: gateway:req_rate
          expr: sum(rate(http_requests_total{job="gateway"}[1m]))
        - record: gateway:err_rate
          expr: sum(rate(http_requests_total{job="gateway",status=~"5.."}[1m]))
        - record: gateway:duration_p95
          expr: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{job="gateway"}[5m])) by (le))
```

---

## 4) Sprint Backlog

### Epic K — Active‑Active Delivery
- **K1**: Provision GA/Route53 latency steering with 50/50 initial dial.  
- **K2**: SLO‑aware weight adjuster + guardrails (min 20% per region).  
- **K3**: Multi‑region canaries serially (east→west) with region flags.

**Acceptance:** dual‑region live traffic; 2‑minute steer on induced SLO breach.

### Epic L — Performance Budgets
- **L1**: Define budgets per top 10 API endpoints.  
- **L2**: CI perf gates with baseline diff tolerance (+10% p95, ≤1% err).  
- **L3**: Nightly perf job publishes trend graphs.

**Acceptance:** one PR blocked by perf regression in staging example; dashboard shows trend.

### Epic M — FinOps Guardrails
- **M1**: OPA policies for previews + workloads; Kubecost feed integration.  
- **M2**: Budget Slack alerts; auto‑teardown of idle previews > 24h.  
- **M3**: Instance class deny‑list and right‑size hints in PR comment.

**Acceptance:** out‑of‑cap preview blocked; idle preview GC executed.

### Epic N — Self‑Service Platform
- **N1**: Cookiecutter template; `new-service.sh` bootstrap.  
- **N2**: Template includes CI, Helm, SLO, Rollouts, OTEL, Gitleaks.  
- **N3**: Golden path docs; internal site (MkDocs) with examples.

**Acceptance:** demo new service ships to stage end‑to‑end in ≤ 30 minutes.

### Epic O — Contracts & Observability
- **O1**: OpenAPI contracts and Dredd tests on PR.  
- **O2**: RED/USE dashboards added for `web` and `intelgraph`.

**Acceptance:** contract test artifact uploaded; RED panels visible in Grafana.

---

## 5) Day‑by‑Day Cadence
- **D1**: GA/Route53 modules; initial dial; health checks validated.  
- **D2**: Adaptive weights action; synthetic breach test.  
- **D3**: Multi‑region canary workflow; region flags; soak.  
- **D4**: Perf budgets and k6 suites; baseline capture.  
- **D5**: FinOps OPA + cost estimator; preview GC.  
- **D6**: Self‑service template + scripts; docs scaffold.  
- **D7**: Contracts + RED rules; Grafana dashboards.  
- **D8–D10**: Soak, fix, acceptance evidence, ship.

---

## 6) Acceptance Evidence to Capture
- GA/Route53 configs, weight history, induced breach timestamps, k6 outputs, perf compare reports, blocked PR examples, Kubecost screenshots, OPA decision logs, preview GC logs, contract test reports, Grafana screenshots.

---

## 7) Risks & Mitigations
- **Traffic flapping** → weight dampening + minimum regional floor (20%).  
- **Perf test noise** → pin workload, warm caches, multiple runs, median‑of‑N.  
- **Cost estimation drift** → reconcile with Kubecost API nightly.

---

## 8) Alignment
- *TRIAD MERGE*: multi‑region canaries reduce blast radius.  
- *UNIFIED DATA FOUNDATION*: contracts keep ingestion stable across regions.  
- *MAESTRO COMPOSER*: self‑service unlocks new components without platform tickets.

---

## 9) Runbooks (new/updated)

```md
# RUNBOOK: Adaptive Traffic Override
- To pin traffic during incident: `./ci/slo/apply_ga_weights.sh '{"us-east-1":100,"us-west-2":0}'`.
- Reason‑for‑access prompt required; change logged and auto‑expires after 60 minutes.
```

```md
# RUNBOOK: Perf Regression PR Block
- Review k6 diff report; identify endpoints over budget.
- If expected, update `budgets/api.yaml` with justification PR.
- Otherwise, fix and push; CI re‑runs gates.
```

---

## 10) Quick‑Start Commands

```bash
# Trigger multi‑region deploy
gh workflow run deploy-multi-region.yml -f version=v1.3.0

# Induce SLO breach (stage) for test
./ci/slo/induce_latency.sh --region us-west-2 --ms 300

# Create new service on paved road
./tools/new-service.sh suggestions
```

---

## 11) Follow‑on Seeds (Sprint 04)
- Cross‑cloud failover (Cloudflare + GA); origin shielding; tiered caching.  
- Adaptive autoscaling using SLO error budget burn rates.  
- Data plane multi‑writer strategy w/ fencing; schema evolution catalog.  
- Privacy guardrails (field‑level retention, tokenization at edge).

