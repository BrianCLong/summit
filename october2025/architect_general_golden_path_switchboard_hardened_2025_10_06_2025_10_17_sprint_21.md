# Architect-General — Golden Path / Switchboard Hardening

**Workstream:** Golden Path Platform + CompanyOS Switchboard  
**Sprint Window:** 2025-10-06 → 2025-10-17 (10 biz days)  
**Ordinal:** Sprint 21 (Q4’25 cadence alignment)  
**Prime Objective:** Ship a *policy-governed, provenance-attested, green* Switchboard v0.2 along the paved road, closing supply‑chain, observability, and rollout gaps while staying aligned with IntelGraph + MC sprints.

---

## 0) Executive Summary & Commitments

- **Now-value (Track A):** Switchboard v0.2 with:
  - Signed builds (Sigstore keyless), SBOMs (Syft), vulnerability gating (Grype), SLSA provenance (GH Attestations).
  - OPA policy bundle v0.2 (deny-by-default, labels, step-up auth hook) + policy tests.
  - Minimal telemetry kit (metrics/logs/trace IDs) + golden dashboard + SLOs + synthetic probes.
  - Release pipeline: canary, auto-rollback guard, and DR runbook.
- **Moat (Track B):** Golden-path templates for future services (repo scaffold, CI, policy pack, Helm chart, TF module, runbooks), reducing time-to-green for new assets to < 1 day.

**Definition of Done:**
- All CI gates green; signed artifacts + SBOM attached to release; attestations and OPA evaluation evidence archived.
- SLO dashboards live; alerts tested; runbooks updated; post-deploy verification captured.

---

## 1) Current State Review (Repo + Sprint Materials)

### 1.1 Observed Assets (sampled)
- `companyos-switchboard/` monorepo with **web app (Next.js)**, **Tauri shell**, **OPA policies**, **OpenAPI stub**, **Makefile**, **local docker-compose**, **basic CI** for build + OPA tests.
- Numerous sprint docs across IntelGraph / Maestro Conductor (MC) indicating Q4’25 cadence and upcoming integration releases.

### 1.2 Evidence of Strengths
- **Local-first** posture with optional infra.
- **OPA presence** and policy tests already wired.
- **CI basics**: lint/typecheck/build for web; OPA fmt/test stage.
- **OpenAPI seed** for Switchboard API.

### 1.3 Gaps Identified (mapped to North Star)
1) **Supply Chain / Provenance**
   - No SBOM generation or attachment to releases.
   - No vulnerability scanning or fail-fast budgets (per service).
   - No cosign/sigstore signing or GH attestations (SLSA provenance).
   - NPM/Rust dependencies not pinned to SHAs/ranges via policy.
2) **Release Engineering**
   - No container build + immutable tags; no Helm chart; no environment overlays.
   - No canary gate, no automated rollback, no drift detection.
3) **Observability & SLOs**
   - No standard metrics/logs/traces SDK usage or dashboards.
   - No SLO definitions, error budgets, synthetic probes.
4) **Security & Policy**
   - OPA policy minimal; lacks ABAC attributes, data classification enforcement, step‑up auth hooks, audit events.
   - No secret scanning in CI; no license scan; no DAST for web.
5) **Governance & Data**
   - No schema versioning/migrations policy beyond raw SQL.
   - No data retention / residency annotations; no audit/event bus hooks.
6) **Docs & Ops**
   - No runbooks (pager sections), release notes template, migration notes, post‑release validation.

---

## 2) Objectives & Key Results (this sprint)

**OBJ‑1: Deterministic supply chain for Switchboard.**  
- **KR1.1**: Generate SBOM (Syft) for web + tauri; include in release artifacts.  
- **KR1.2**: Grype vuln scan with budget; fail build if Sev≥High not waived.  
- **KR1.3**: Keyless signing (cosign OIDC) of images/bundles; verify in deploy.  
- **KR1.4**: GitHub Attestations (SLSA provenance) emitted + verified.

**OBJ‑2: Paved-road CI/CD with guardrails.**  
- **KR2.1**: GH Actions workflow: build → test → sbom → scan → sign → attest → release.  
- **KR2.2**: Helm chart v0.1 (web + opa sidecar + nats optional); kustomize overlays.  
- **KR2.3**: Canary (10%) + auto-rollback on SLO breach / probe fail.

**OBJ‑3: Observability & SLOs.**  
- **KR3.1**: Add metrics/logging/trace headers; standard middleware.  
- **KR3.2**: Golden dashboard published (status, latency, errors, apdex).  
- **KR3.3**: SLOs codified: Availability 99.5%, p95 Latency ≤ 300ms, Error rate ≤ 1%.  
- **KR3.4**: Synthetic probes (cron + on‑deploy) with stage gates.

**OBJ‑4: Policy pack v0.2.**  
- **KR4.1**: ABAC attributes (role, residency, classification, step_up).  
- **KR4.2**: Meeting token issuance policy + audit events.  
- **KR4.3**: Policy tests for happy/deny/step-up cases (≥ 12 tests).

**OBJ‑5: Ops docs & evidence.**  
- **KR5.1**: Runbooks (pager duty, rollback script).  
- **KR5.2**: Release notes + migration notes templates.  
- **KR5.3**: Post‑deploy verification playbook + archived evidence.

---

## 3) Work Breakdown & Assignments

| # | Epic | Issue | Owner | Acceptance | Evidence |
|---|------|-------|-------|------------|----------|
| A | Supply Chain | SBOM + scan + budget gates | SecEng | CI fails on Sev≥High | SBOM JSON, Grype SARIF, CI logs |
| B | Supply Chain | Cosign keyless + verify | SRE | `cosign verify-attestation` in deploy | Signed image + attest |
| C | CI/CD | GH workflow v2 | DevOps | Reusable workflow; env matrix | Action runs + artifacts |
| D | Deploy | Helm chart v0.1 + overlays | SRE | `helm template` clean; lint ok | Chart lint; values schema |
| E | Release | Canary + rollback | SRE | auto-revert on probe failure | Rollback logs |
| F | Observability | SDK + dashboard | AppEng | /metrics endpoint & logs | Grafana JSON, alert rules |
| G | Policy | ABAC + tests | SecEng | 12 policy tests green | OPA test output |
| H | Ops | Runbooks & templates | ProdOps | DR game-day run | Runbook docs |

---

## 4) Implementation Artifacts (Ready to Drop-In)

### 4.1 GitHub Actions — Reusable Golden Workflow (`.github/workflows/golden.build-release.yml`)
```yaml
name: golden-build-release
on:
  workflow_call:
    inputs:
      image_name: { required: true, type: string }
      node_version: { required: false, type: string, default: '20' }
      push_image: { required: false, type: boolean, default: true }
    secrets:
      REGISTRY: { required: true }

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # for keyless signing / attestations
      contents: read
      packages: write
      attestations: write
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ inputs.node_version }} }
      - name: Install deps
        run: |
          npm ci
          npm --prefix apps/web ci
      - name: Typecheck & build web
        run: |
          npm --prefix apps/web run typecheck
          npm --prefix apps/web run build
      - name: Build container
        run: |
          echo "FROM nginx:stable\nCOPY apps/web/out /usr/share/nginx/html" > Dockerfile
          docker build -t ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }} .
      - name: Syft SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }}
          format: cyclonedx-json
          output-file: sbom.cdx.json
      - name: Grype scan
        uses: anchore/scan-action@v5
        with:
          image: ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }}
          severity-cutoff: high
      - name: Login to registry
        if: inputs.push_image == true
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Push image
        if: inputs.push_image == true
        run: docker push ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }}
      - name: Cosign sign (keyless)
        uses: sigstore/cosign-installer@v3
      - name: Sign & attest
        run: |
          cosign sign --yes ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }}
          gh attestation sign --subject ${{ secrets.REGISTRY }}/${{ inputs.image_name }}:${{ github.sha }} --predicate-type slsa.provenance
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-artifacts
          path: |
            sbom.cdx.json
```

### 4.2 Switchboard CI Caller (`.github/workflows/ci.switchboard.v2.yml`)
```yaml
name: CI Switchboard v2
on:
  pull_request:
  push:
    branches: [ main ]
jobs:
  call:
    uses: ./.github/workflows/golden.build-release.yml
    with:
      image_name: companyos/switchboard-web
    secrets:
      REGISTRY: ghcr.io/${{ github.repository_owner }}
```

### 4.3 Helm Chart Skeleton (`deploy/helm/switchboard`)
```
charts/
  switchboard/
    Chart.yaml
    values.yaml
    templates/
      deployment.yaml
      service.yaml
      ingress.yaml
      opa-configmap.yaml
      hpa.yaml
```

**`Chart.yaml`**
```yaml
apiVersion: v2
name: switchboard
version: 0.1.0
appVersion: "0.2.0"
```

**`values.yaml`**
```yaml
image:
  repository: ghcr.io/org/switchboard-web
  tag: "${GIT_SHA}"
  pullPolicy: IfNotPresent
opa:
  enabled: true
  bundleURL: "https://registry.example.com/opa/bundles/switchboard.tar.gz"
service:
  type: ClusterIP
  port: 80
resources: {}
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 6
  targetCPUUtilizationPercentage: 70
canary:
  enabled: true
  weight: 10
```

**`templates/deployment.yaml` (excerpt)**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: switchboard
  labels: { app: switchboard }
spec:
  replicas: 2
  selector: { matchLabels: { app: switchboard } }
  template:
    metadata:
      labels: { app: switchboard }
      annotations:
        cosign.sigstore.dev/imageRef: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
    spec:
      containers:
        - name: web
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports: [{ containerPort: 80 }]
        - name: opa
          image: openpolicyagent/opa:latest-rootless
          args: ["run", "--server", "--log-level=info", "--bundle", "/policy"]
          volumeMounts:
            - name: policy
              mountPath: /policy
      volumes:
        - name: policy
          configMap:
            name: switchboard-opa
```

### 4.4 OPA Policy Pack v0.2 (`policies/switchboard_v0_2.rego`)
```rego
package switchboard

import future.keywords.if

default allow := false

# Attribute-based access control
allow if {
  input.subject.authenticated
  input.subject.role in {"admin","operator","analyst"}
  input.subject.webauthn_verified if input.action in {"render_widget","issue_meeting_token"}
  input.context.classification <= data.labels.allow_max
  not deny_reason[_]
}

# Residency & data classification guard
deny_reason["residency_mismatch"] if {
  input.resource.residency in {"EU","US"}
  input.context.region != input.resource.residency
}

deny_reason["confidentiality"] if {
  input.resource.classification == "secret"
  not input.subject.step_up
}

# Meeting token issuance policy
allow_meeting if {
  input.action == "issue_meeting_token"
  allow
}

# Labels
package labels
allow_max := 2 # 0 public, 1 internal, 2 confidential, 3 secret
```

**Policy Tests (`policies/tests/switchboard_v0_2_test.rego`)**
```rego
package switchboard_test

test_render_widget_admin_allow {
  input := {
    "subject": {"authenticated": true, "role":"admin", "webauthn_verified": true},
    "action": "render_widget",
    "resource": {"widget":"AgentRoster", "classification":1},
    "context": {"classification":1, "region":"US"}
  }
  allow with input as input
}

test_secret_requires_step_up_denied {
  input := {
    "subject": {"authenticated": true, "role":"operator"},
    "action": "render_widget",
    "resource": {"widget":"LiveTiles", "classification":3},
    "context": {"classification":3}
  }
  not allow with input as input
}
```

### 4.5 OpenAPI Expansion (`apis/switchboard.yaml` excerpt)
```yaml
openapi: 3.0.3
info: { title: CompanyOS Switchboard API, version: 0.2.0 }
paths:
  /healthz: { get: { summary: Liveness, responses: { '200': { description: OK }}}}
  /readyz:  { get: { summary: Readiness, responses: { '200': { description: OK }}}}
  /metrics: { get: { summary: Prometheus metrics, responses: { '200': { description: OK }}}}
  /agents:
    get:
      summary: List registered agents
      responses: { '200': { description: OK }}
  /actions/dispatch:
    post:
      summary: Send structured action to agent with policy check
      requestBody: { required: true }
      responses: { '202': { description: Accepted }}
  /meetings/token:
    post:
      summary: Mint ephemeral meeting token (policy‑gated)
      responses: { '200': { description: OK }}
```

### 4.6 Observability Kit (Node/Next.js middleware)
**`apps/web/src/middleware/obs.ts`**
```ts
import { randomUUID } from 'crypto';

export function withObs(handler: any){
  return async (req: any, res: any) => {
    const traceId = req.headers['x-trace-id'] || randomUUID();
    const start = Date.now();
    res.setHeader('x-trace-id', traceId);
    try {
      const result = await handler(req, res);
      const dur = Date.now()-start;
      console.log(JSON.stringify({ msg:'request', traceId, path:req.url, status: res.statusCode, dur }));
      return result;
    } catch (e:any){
      console.error(JSON.stringify({ msg:'error', traceId, path:req.url, err: e?.message }));
      throw e;
    }
  };
}
```

**Prometheus Exporter Stub**
```ts
// apps/web/src/app/api/metrics/route.ts
import client from 'prom-client';
const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });
export async function GET(){
  return new Response(await reg.metrics(), { headers: { 'content-type':'text/plain' }});
}
```

### 4.7 SLOs & Alerts (`ops/slo/switchboard.slo.yaml`)
```yaml
service: switchboard-web
slos:
  - name: availability
    objective: 99.5
    window: 28d
    indicator: http_availability
  - name: latency_p95
    objective: 300ms
    window: 7d
    indicator: http_latency_p95
  - name: error_rate
    objective: 1%
    window: 7d
    indicator: http_5xx_rate
alerts:
  - name: slo-burn
    condition: error_budget_burn > 2x for 1h
  - name: latency-p95
    condition: http_latency_p95 > 300ms for 15m
```

### 4.8 Synthetic Probes (`ops/synthetics/probe.switchboard.yaml`)
```yaml
probes:
  - name: home
    method: GET
    url: https://switchboard.example.com/
    expect_status: 200
  - name: metrics
    method: GET
    url: https://switchboard.example.com/metrics
    expect_status: 200
  - name: policy-check
    method: POST
    url: https://switchboard.example.com/api/decision
    body: { action: "render_widget", subject:{ authenticated:true, webauthn_verified:true }, resource:{ widget:"LiveTiles"}}
    expect_status: 200
```

### 4.9 Canary & Rollback Gate (`.github/workflows/deploy.canary.yml`)
```yaml
name: deploy-canary
on: workflow_dispatch
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Helm upgrade (10% canary)
        run: |
          helm upgrade --install switchboard deploy/helm/switchboard \
            --set image.tag=${{ github.sha }} --set canary.enabled=true --set canary.weight=10
      - name: Run synthetics
        run: |
          ./ops/bin/run-probes ops/synthetics/probe.switchboard.yaml > probe.out || true
          cat probe.out
      - name: Gate on probes/SLO
        run: |
          if grep -q "FAIL" probe.out; then
            echo "Probes failed, rolling back" && \
            helm rollback switchboard && exit 1; fi
```

### 4.10 Runbooks
**`ops/runbooks/switchboard.oncall.md`**
```md
# Switchboard — On‑Call
- Pager policy: Sev1 24/7, Sev2 business hours.
- Dashboards: Grafana › Switchboard Overview
- Quick checks: /healthz, /readyz, /metrics, logs (traceId filter)
- Playbooks: canary rollback, cache clear, policy bundle invalidate
```

**`ops/runbooks/switchboard.rollback.md`**
```md
# Rollback
1) `helm history switchboard`
2) `helm rollback switchboard <REV>`
3) Validate: synthetics + dashboards
4) Postmortem: capture traceIds, attach evidence
```

### 4.11 Docs Templates
**Release Notes (`docs/release_notes.tpl.md`)**
```md
# Switchboard v{{version}} — {{date}}
## Highlights
- …
## Security
- SBOM: attached (CycloneDX)
- Attestations: GH Attestations + Cosign
## Ops
- SLO changes: …
- Migration steps: …
```

**ADR Template (`docs/adr/000-template.md`)**
```md
# ADR NNN: <Title>
- Status: Proposed/Accepted/Rejected
- Context: …
- Decision: …
- Consequences: …
- Evidence: links to CI runs, SBOM, attestations
```

### 4.12 Terraform Module Skeleton (`infra/tf/modules/switchboard`) 
```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers { kubernetes = { source = "hashicorp/kubernetes" } }
}

variable "namespace" { type = string }
variable "image" { type = string }

resource "kubernetes_namespace" "this" { metadata { name = var.namespace } }
```

---

## 5) Integration & Alignment Notes (IntelGraph + MC)
- **Shared Telemetry Contract:** standard trace headers `x-trace-id`; status tiles consume IntelGraph events via NATS (optional this sprint; stubbed provider returns counters).
- **Policy Alignment:** `classification` labels harmonized with IntelGraph; MC uses same ABAC attributes for action dispatch.
- **Release Train:** Align with MC Canary on 2025-10-13; Switchboard canary goes first (10%), MC follows once probes are green.

---

## 6) Test Strategy
- **Unit:** policy tests (OPA), UI component tests (React Testing Library), utility functions.
- **Integration:** synthetic probes against preview env; OpenAPI contract checks.
- **Security:** dependency scan (Grype), secret scan (gitleaks), content security headers check.
- **Performance:** simple k6 smoke (p95 under 300ms goal) — optional if time allows.

---

## 7) Acceptance Checklist (DoR → DoD)
- [ ] Problem statement, success metrics, constraints written.
- [ ] ADRs for signing, SBOM policy, canary strategy accepted.
- [ ] CI green with SBOM + attestation.
- [ ] Helm chart deployed to staging; synthetics pass.
- [ ] SLOs/alerts live; pager test fired & acknowledged.
- [ ] Release notes drafted; runbooks updated.
- [ ] Evidence archived (CI run URLs, attestation verify logs, Grafana snapshot).

---

## 8) Risks & Mitigations
- **OIDC/cosign flake:** cache OIDC token; provide manual fallback (key pair) if blocked.
- **False‑positive CVEs:** waiver process with expiry; track in repo under `security/waivers`.
- **Observability noise:** rate-limit logs; only structured JSON; drop PII at source.

---

## 9) Backlog (Next Sprint Seed)
- WebAuthn step‑up flow in UI; audit trail viewer; data residency map; DLP redaction library integration; DR game‑day automation; perf budgets in CI.

---

## 10) Evidence Hooks (to fill during sprint)
- **CI Run IDs:** …
- **Release SHA:** …
- **SBOM digest:** …
- **Cosign bundle:** …
- **Grafana snapshot link:** …

---

## 11) Quickstart Commands
```bash
# Run CI locally (approximation)
make policy-test
npm --prefix apps/web run typecheck && npm --prefix apps/web run build

# Build image + SBOM (locally)
docker build -t ghcr.io/org/switchboard-web:dev .
syft packages ghcr.io/org/switchboard-web:dev -o cyclonedx-json > sbom.cdx.json

# Helm lint & template
helm lint deploy/helm/switchboard
helm template switchboard deploy/helm/switchboard | kubeconform -strict -ignore-missing-schemas
```

---

## 12) Changelog (to start upon merge)
- v0.2.0 (2025-10-17): Signed builds, SBOM, SLOs, canary + rollback, policy v0.2.
