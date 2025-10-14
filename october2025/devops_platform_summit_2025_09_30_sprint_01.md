# Ops & Delivery Orchestrator — Workstream Plan (Sprint 01)

**Slug:** `devops-platform-summit-2025-09-30-sprint-01`  
**Dates:** 2025‑09‑30 → 2025‑10‑11 (2 weeks)  
**Role:** DevOps / CI‑CD / Deployment / Repo Arborist / Merge & Release Captain  
**Environments:** dev → stage → prod (plus ephemeral preview per PR)  
**Mission:** Ship safe, fast, reversible changes with full observability, policy guardrails, and canary+rollback for IntelGraph + Maestro.

---

## 0) Context Snapshot (from repo + sprint docs)

- **Stacks present:** Helm charts for `intelgraph`, `gateway`, `neo4j`, `postgres`, `redis`, `analytics` under `infra/helm`; K8s overlays under `infra/k8s` with `kyverno`, `monitoring`, `rbac`, `ingress`, etc.  
- **CI/CD:** ~49 GH Actions workflows including `ci.yml`, `ci-comprehensive.yml`, `build-images.yml`, `canary-deployment.yml`, `auto-rollback.yml`, `error-budget-monitoring.yml`, `deploy.yml`.  
- **IaC:** Terraform layouts for `aws`, `oci`, plus `infra/docker-compose.*` for local & demo.  
- **Security/Compliance:** OPA/Conftest wiring, CodeQL, SBOM attest hints; Cosign references.  
- **Planning artifacts:** GA plans & multiple sprint files (e.g., *TRIAD MERGE*, *UNIFIED DATA FOUNDATION*, *MAESTRO COMPOSER*), backlog YAML with P0/P1 stories.

> Conclusion: Excellent foundation. However, several pieces are partial or lack strict gates/automation in the golden path.

---

## 1) Gaps & Risks (within my ambit)

### 1.1 CI/CD & Supply Chain
- **Terraform deploy workflow** runs `apply` on push without a mandatory `plan` approval or OIDC‑backed ephemeral credentials per env.
- **Canary workflow** exists but inputs/health gates appear stubbed; missing codified rollback criteria + objective health signals.
- **Auto‑rollback** job exists but lacks end‑to‑end linkage to rollout controller + Helm values to drive rollback.
- **SBOM & provenance**: present in parts; need consistent **attest → verify → policy gate** on every image and chart.
- **Preview environments**: implied but no unified action that spins K8s namespace + seeded data + secrets on each PR.

### 1.2 Observability & SLOs
- **Golden signals** not fully wired to gates: p95 latency, error‑rate, saturation should block promotion.  
- **OTEL** collector config not standardized across services.  
- **Grafana/SLO rules** incomplete: need PrometheusRules for burn‑rate + dashboards tied to service SLOs.

### 1.3 Progressive Delivery
- **Argo Rollouts/Flagger** not consistently configured; Helm charts lack `canary` values schema; no standard health checks.

### 1.4 Secrets & Compliance
- **`.env` artifacts** exist in repo; need enforced use of **sealed‑secrets** and CI secret scanning with deny rules.  
- **Access governance**: missing step‑up auth hooks for risky ops in admin flows (policy present, gate missing in CI/CD for prod changes).  
- **Audit**: release approvals & reason‑for‑access prompts not enforced in pipelines.

### 1.5 Repo Hygiene
- Many workflows, but **branch protections** and mandatory checks not centralized in a policy as code file; stale branches likely; CODEOWNERS may be incomplete on infra paths.

---

## 2) Sprint Goal

> **Make production promotion boring.** Establish the golden path that: plans → previews → canaries → verifies → promotes, with auto‑rollback and airtight provenance.

**Definition of Success:**
- One PR triggers: build+scan → SBOM+attest → preview env → e2e path → health SLO green → staged canary → auto‑promotion or rollback.

---

## 3) Scope (In/Out)

**In**
- OIDC auth for cloud; Terraform `plan → apply` with manual approval gates.
- Argo Rollouts canary for `gateway` and `web` charts (reference pattern for others).
- Preview env per PR (namespace, seeded data, sealed secrets).
- OTEL collector baseline; Prometheus SLO rules; Grafana dashboards.
- SBOM (CycloneDX) + Cosign attest + policy verification gate.
- Repo hygiene (branch protections, CODEOWNERS refresh, labels, chatops).

**Out (this sprint)**
- Cross‑region DR drills (prep only); cost dashboards beyond baseline; full DLP.

---

## 4) Deliverables (Artifacts you can merge today)

### 4.1 GitHub Actions — Golden Path

```yaml
# .github/workflows/ci-pr.yml
name: CI • PR Golden Path
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  packages: write
  id-token: write
jobs:
  build_test_scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install deps
        run: npm ci --prefer-offline
      - name: Unit + Lint
        run: npm run -s verify
      - name: Build images
        run: |
          ./ci/build.sh # multi-arch, tags: pr-${{ github.event.number }}-${{ github.sha }}
      - name: SBOM (CycloneDX) + attest
        run: ./ci/sbom_attest.sh ${{ github.sha }}
      - name: Trivy scan (fs+image)
        run: ./ci/trivy_scan.sh
      - name: Policy (Conftest/OPA)
        run: ./ci/policy_gate.sh
  preview_env:
    needs: build_test_scan
    runs-on: ubuntu-latest
    environment: preview
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - name: Auth via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_PREVIEW }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Create namespace + secrets
        run: ./ci/preview_bootstrap.sh ${{ github.event.number }}
      - name: Helm upgrade --install
        run: ./ci/preview_deploy.sh ${{ github.event.number }} ${{ github.sha }}
      - name: Smoke + e2e path
        run: ./ci/e2e.sh --base https://pr-${{ github.event.number }}.preview.example.com
      - name: Comment preview URL
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          message: |
            ▶ Preview: https://pr-${{ github.event.number }}.preview.example.com
```

```yaml
# .github/workflows/release-train.yml
name: 🚢 Release Train (weekly)
on:
  workflow_dispatch:
  schedule:
    - cron: '0 17 * * 5' # Fridays 17:00 UTC
permissions:
  contents: write
  packages: write
  id-token: write
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
jobs:
  cut:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Version + changelog
        run: ./ci/release_notes.sh
      - name: Build + sign images
        run: ./ci/build_sign.sh ${{ github.ref_name }}
      - name: SBOM + attest
        run: ./ci/sbom_attest.sh ${{ github.ref_name }}
  stage_canary:
    needs: cut
    runs-on: ubuntu-latest
    environment: stage
    steps:
      - uses: actions/checkout@v4
      - name: OIDC auth
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_STAGE }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Helm canary 10%
        run: ./ci/canary_rollout.sh stage 10 ${{ github.ref_name }}
      - name: Health gate (SLO burn rate)
        run: ./ci/health_gate.sh stage 15m --slo apigw-p95<1500ms err<1%
  promote_prod:
    needs: stage_canary
    runs-on: ubuntu-latest
    environment:
      name: prod
      url: https://console.example.com
    steps:
      - uses: actions/checkout@v4
      - name: Manual approval
        uses: trstringer/manual-approval@v1
        with: { secret: ${{ secrets.GITHUB_TOKEN }}, reviewers: team:release-captains }
      - name: Helm canary 25% → 50% → 100%
        run: ./ci/canary_progressive.sh prod ${{ github.ref_name }}
      - name: Post‑deploy soak + verify
        run: ./ci/postdeploy_verify.sh prod
```

### 4.2 Terraform — Plan/Apply with OIDC + Policy

```hcl
// infra/aws/backend.tf
terraform {
  backend "s3" {
    bucket = "summit-tfstates"
    key    = "env/${env}/infra.tfstate"
    region = var.region
    dynamodb_table = "summit-tflock"
    encrypt = true
  }
  required_providers { aws = { source = "hashicorp/aws" } }
}
```

```yaml
# .github/workflows/infra-plan-apply.yml
name: IaC • Plan → Apply (gated)
on:
  pull_request:
    paths: ["infra/**", "*.tf", "**/*.tf"]
  workflow_dispatch:
permissions: { contents: read, id-token: write }
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_ROLE_IAC }}, aws-region: ${{ secrets.AWS_REGION }} }
      - uses: hashicorp/setup-terraform@v3
      - name: terraform init/plan
        run: |
          cd infra/aws && terraform init -input=false
          terraform plan -input=false -out=plan.tfplan -var env=stage
      - name: Conftest policy gate (terraform plan JSON)
        run: terraform show -json plan.tfplan > plan.json && conftest test plan.json
      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with: { name: tfplan-stage, path: infra/aws/plan.tfplan }
  apply:
    if: github.ref == 'refs/heads/main'
    needs: plan
    environment: stage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: tfplan-stage, path: . }
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_ROLE_IAC }}, aws-region: ${{ secrets.AWS_REGION }} }
      - uses: hashicorp/setup-terraform@v3
      - name: Manual approval ☑️
        uses: trstringer/manual-approval@v1
        with: { secret: ${{ secrets.GITHUB_TOKEN }}, reviewers: team:platform }
      - name: terraform apply
        run: terraform apply -input=false tfplan-stage
```

### 4.3 Helm — Rollouts & Canary Values Schema

```yaml
# infra/helm/gateway/values-canary.yaml
rollout:
  enabled: true
  strategy: canary
  canary:
    steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 25
      - pause: { duration: 10m }
      - setWeight: 50
      - pause: { duration: 15m }
      - setWeight: 100
metrics:
  prometheus:
    address: http://prometheus.monitoring:9090
    checks:
      - name: p95_latency
        query: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{job="gateway"}[5m])) by (le))
        threshold: 1.5
        comparator: "<"
      - name: error_rate
        query: sum(rate(http_requests_total{job="gateway",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="gateway"}[5m]))
        threshold: 0.01
        comparator: "<"
```

### 4.4 Observability — OTEL + PrometheusRules + Dashboards

```yaml
# infra/k8s/monitoring/prometheus-rules-slo.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-slo
  namespace: monitoring
spec:
  groups:
    - name: gateway.slo
      rules:
        - record: job:http_request_error_rate:ratio_rate5m
          expr: sum(rate(http_requests_total{job="gateway",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="gateway"}[5m]))
        - alert: GatewayErrorBudgetBurn
          expr: job:http_request_error_rate:ratio_rate5m > 0.01
          for: 10m
          labels: { severity: critical }
          annotations: { summary: "Gateway error budget burn >1%" }
        - alert: GatewayLatencyHigh
          expr: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{job="gateway"}[5m])) by (le)) > 1.5
          for: 10m
          labels: { severity: warning }
          annotations: { summary: "Gateway p95 latency >1.5s" }
```

```yaml
# infra/otel/collector.yaml (baseline)
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata: { name: otel-collector }
spec:
  config: |
    receivers:
      otlp: { protocols: { http: {}, grpc: {} } }
    processors:
      batch: {}
      memory_limiter: {}
      k8sattributes: {}
      resourcedetection: { detectors: [env, k8s] }
    exporters:
      prometheus:
        endpoint: 0.0.0.0:8889
      otlp:
        endpoint: tempo-distributor.tempo:4317
        tls: { insecure: true }
    service:
      pipelines:
        metrics: { receivers: [otlp], processors: [batch], exporters: [prometheus] }
        traces:  { receivers: [otlp], processors: [batch], exporters: [otlp] }
```

### 4.5 Supply Chain — Cosign + SBOM + Policy Gate

```bash
# ci/sbom_attest.sh
set -euo pipefail
IMG_TAG="${1:?img or tag}"
cyclonedx-bom -o sbom.json
cosign sign --yes $REGISTRY_IMAGE:$IMG_TAG
cosign attest --predicate sbom.json --type cyclonedx $REGISTRY_IMAGE:$IMG_TAG
cosign verify $REGISTRY_IMAGE:$IMG_TAG --certificate-identity-regexp ".*github.com/.+/.+/.github/workflows/.+" --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

```bash
# ci/policy_gate.sh
set -euo pipefail
conftest test k8s/*.yaml helm/**/values*.yaml sbom.json
```

### 4.6 Secrets — Sealed Secrets Baseline

```yaml
# infra/k8s/sealed-secrets/README.md
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
# Commit sealed-secret.yaml; never commit secret.yaml
```

```yaml
# infra/k8s/sealed-secrets/secret-example.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata: { name: ghcr-pull, namespace: default }
spec:
  encryptedData:
    .dockerconfigjson: AGE-SEALED-PAYLOAD
  template:
    type: kubernetes.io/dockerconfigjson
```

### 4.7 Repo Hygiene — Protections & CODEOWNERS

```ini
# .github/CODEOWNERS
/infra/helm/**        @platform/ops
/infra/k8s/**         @platform/ops
/.github/workflows/** @platform/ops
/infra/**.tf          @platform/ops
```

```yaml
# .github/branch-protection.yml (managed via policy bot)
branches:
  - name: main
    required_status_checks:
      strict: true
      contexts:
        - CI • PR Golden Path/build_test_scan
        - IaC • Plan → Apply (gated)/plan
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      require_code_owner_reviews: true
    restrictions: { users: [], teams: [platform] }
```

### 4.8 Runbooks & Templates

```md
# RUNBOOK: Canary Rollout & Auto‑Rollback
- Prechecks: SLO dashboard green; error budget > 99% remaining.
- Rollout: 10%→25%→50%→100% with gates on p95<1.5s & err<1%.
- Rollback triggers: any gate breach for ≥10m or saturation >80%.
- Actions: `helm rollback <release> <rev>`; freeze deployments; incident channel; postmortem template.
```

```md
# RELEASE NOTES TEMPLATE
## Version X.Y.Z (YYYY‑MM‑DD)
- ✨ Features
- 🛠 Fixes
- 🔐 Security
- 🧰 Ops/Infra
- 📈 Observability
- 🧪 Tests
- ⚠️ Breaking changes
- 🚒 Rollback plan
```

---

## 5) Sprint Backlog (2 weeks)

### Epic A — Golden Path CI/CD
- **A1**: Implement `ci-pr.yml` (build→scan→SBOM→policy→preview).  
- **A2**: Implement `release-train.yml` with stage canary & health gate.  
- **A3**: IaC `plan→apply` gated with OIDC + Conftest.  
- **A4**: ChatOps `/deploy canary` command to trigger workflow_dispatch.

**Acceptance:** green runs on demo PR + artifact evidence.

### Epic B — Progressive Delivery
- **B1**: Add Argo Rollouts to `gateway` & `web` charts with `values-canary.yaml`.  
- **B2**: Wire metric queries + thresholds; document rollback runbook.

**Acceptance:** successful 10→100% rollout in stage with screenshots.

### Epic C — Observability & SLOs
- **C1**: Deploy OTEL collector baseline.  
- **C2**: PrometheusRules for `gateway` SLOs; alerts to on‑call.  
- **C3**: Grafana dashboard JSON committed & linked in README.

**Acceptance:** p95/error widgets live; alerts fire on synthetic breach.

### Epic D — Secrets & Compliance
- **D1**: Sealed‑secrets operational; remove `.env.*` from repo history (BFG).  
- **D2**: Add secret scans (Gitleaks) to CI; deny on findings.  
- **D3**: Reason‑for‑access prompt on prod apply and prod rollout.

**Acceptance:** compliance evidence in PRODUCTION_GO_EVIDENCE.md.

### Epic E — Repo Hygiene
- **E1**: CODEOWNERS coverage for infra paths.  
- **E2**: Branch protection policy synced.  
- **E3**: Stale branch pruning (safe list + archived refs).

**Acceptance:** policy bot report; repository settings export committed.

---

## 6) Day‑by‑Day Cadence

- **D1‑D2**: CI golden path & preview env scripts; CODEOWNERS.  
- **D3‑D4**: Terraform plan/apply gating; secrets sealing; gitleaks.  
- **D5**: Argo Rollouts + canary values; gateway wired.  
- **D6**: OTEL collector; PrometheusRules; Grafana baseline.  
- **D7**: Stage dry‑run release train; health gates tuned.  
- **D8**: Auto‑rollback wiring; runbook drills; finalize docs.  
- **D9‑D10**: Soak, fix, evidence capture, ship.

---

## 7) Acceptance Evidence (to collect)
- Links to CI runs, preview URLs, rollout history, Prometheus alerts, Grafana screenshots, Cosign verification output, Conftest report, branch‑protection export, sealed‑secrets diffs.

---

## 8) Risks & Mitigations
- **Metric flakiness** → use synthetic load (k6) during canary.
- **Secret migration churn** → progressive replacement with dual‑reads.
- **Policy false positives** → quarantine mode first, then enforce.

---

## 9) DoR / DoD

**Ready:** ticket scoped, risks listed, tests defined, migration plan (if any), observability adds, flag strategy, rollback path.  
**Done:** merged via protected PR, preview passed, canary verified, dashboards green, audits present, docs & runbooks updated.

---

## 10) How this aligns with existing sprints
- *TRIAD MERGE* & *UNIFIED DATA FOUNDATION* depend on safe deploys → this sprint creates the delivery runway.
- *MAESTRO COMPOSER* backend needs preview envs → delivered in Epic A.
- GA plans require policy+provenance evidence → delivered in Epics A/D.

---

## 11) Quick‑Start Commands (for humans)

```bash
# Preview env for PR 123
./ci/preview_bootstrap.sh 123 && ./ci/preview_deploy.sh 123 $GIT_SHA

# Stage canary from release tag v1.2.3
./ci/canary_rollout.sh stage 10 v1.2.3 && ./ci/health_gate.sh stage 15m

# Verify Cosign + SBOM
./ci/sbom_attest.sh v1.2.3 && ./ci/policy_gate.sh
```

---

## 12) Follow‑on (Next Sprint seeds)
- DR drill on stage (failover of Neo4j + Postgres with RTO/RPO proof).  
- Multi‑region CDNs + WAF policy.  
- Cost guardrails (Karpenter/cluster autoscaling policies, idle detection).  
- Data retention policies + dual‑control deletes.

---

### Appendix A — Minimal k6 Load for Canary Gate
```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 20, duration: '10m' };
export default function () {
  const res = http.get(`${__ENV.BASE}/health`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Appendix B — Gitleaks in CI
```yaml
- name: Gitleaks Scan
  uses: gitleaks/gitleaks-action@v2
  with: { args: "detect --redact --exit-code 1" }
```

### Appendix C — ChatOps Commands (slash‑commands)
```yaml
# .github/commands.yml
commands:
  - name: deploy-canary
    description: Canary deploy a version to an environment
    workflow: canary-deployment.yml
    inputs: [version, environment, canary_percentage]
```

