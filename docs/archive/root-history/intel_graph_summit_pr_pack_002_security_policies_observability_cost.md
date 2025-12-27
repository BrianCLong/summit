# PR Pack 002 — Security, Policy, Observability, Cost (Ready-to-merge)

This pack deepens security and promotion safety with deploy-time verification, runtime hardening, production-ready canary analysis, preview auto‑teardown, cost guardrails, and drift detection. 12 small PRs; each includes rollback notes.

---

## PR 11 — Sigstore policy‑controller (enforce signed images & provenance)

**Purpose:** Only allow images signed by CI with attached provenance.

**Files:**

**`k8s/sigstore/policy-controller.yaml`** (install via Helm or static manifest; example value snippet)

```yaml
apiVersion: policy.sigstore.dev/v1alpha1
kind: ClusterImagePolicy
metadata:
  name: require-signed-and-provenance
spec:
  images:
    - glob: 'ghcr.io/<org>/<repo>/*'
  authorities:
    - keyless:
        identities:
          - issuer: https://token.actions.githubusercontent.com
            subjectRegExp: '.*'
  attestations:
    - name: slsa-provenance
      predicateType: https://slsa.dev/provenance/v1
      policy:
        type: cue
        data: |
          predicate.buildType == "https://github.com/Attestations/GitHubHostedActions@v1"
```

**Rollback:** Remove `ClusterImagePolicy`; workloads run without signature/provenance enforcement.

---

## PR 12 — SLSA L3 provenance in CI

**Purpose:** Emit in‑toto/SLSA attestations and push to GHCR.

**Files:**

**`.github/workflows/ci-security.yml`** (add after image build)

```yaml
containers:
  steps:
    # ... build/tag image step above
    - name: Install cosign
      uses: sigstore/cosign-installer@v3
    - name: Sign image (keyless)
      env: { COSIGN_EXPERIMENTAL: 'true' }
      run: cosign sign --yes $IMAGE
    - name: Generate SLSA provenance
      uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
      with:
        base64-subjects: 'sha256:${{ steps.digest.outputs.sha256 }}'
        upload-assets: true
```

**Rollback:** Comment out SLSA step; keep signing.

---

## PR 13 — Kyverno policies (secure-by-default workloads)

**Purpose:** Enforce non‑root, drop dangerous capabilities, deny `:latest`, require resources and labels.

**Files:**

**`k8s/kyverno/policies.yaml`**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: secure-workloads }
spec:
  validationFailureAction: enforce
  background: true
  rules:
    - name: disallow-latest-tag
      match: { resources: { kinds: [Pod] } }
      validate:
        message: 'Image tag :latest is not allowed'
        pattern:
          spec:
            containers:
              - image: '!*:latest'
    - name: require-nonroot-readonly
      match: { resources: { kinds: [Pod] } }
      validate:
        message: 'Containers must run as non-root and read-only'
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
            containers:
              - securityContext:
                  readOnlyRootFilesystem: true
                  allowPrivilegeEscalation: false
    - name: drop-capabilities
      match: { resources: { kinds: [Pod] } }
      validate:
        pattern:
          spec:
            containers:
              - securityContext:
                  capabilities:
                    drop: ['ALL']
    - name: require-requests-limits
      match: { resources: { kinds: [Pod] } }
      validate:
        message: 'CPU/Memory requests & limits required'
        pattern:
          spec:
            containers:
              - resources:
                  requests:
                    cpu: '?*'
                    memory: '?*'
                  limits:
                    cpu: '?*'
                    memory: '?*'
    - name: require-owner-labels
      match: { resources: { kinds: [Pod, Deployment, Rollout] } }
      validate:
        message: 'owner and tier labels are required'
        pattern:
          metadata:
            labels:
              owner: '?*'
              tier: '?*'
```

**Rollback:** Set `validationFailureAction: audit`.

---

## PR 14 — Pod Security Admission (PSA) enforce Restricted

**Purpose:** Baseline K8s hardening aligned with PSA.

**Files:**

**`k8s/namespaces/prod.yaml`** (example)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    pod-security.kubernetes.io/enforce: 'restricted'
    pod-security.kubernetes.io/enforce-version: 'latest'
```

**Rollback:** Remove/relax PSA labels to `baseline`.

---

## PR 15 — NetworkPolicies: default deny + explicit allows

**Purpose:** Limit blast radius; permit only needed flows.

**Files:**

**`k8s/network/default-deny.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: prod }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

**`k8s/network/allow-ingress.yaml`** (example for web)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: web-allow, namespace: prod }
spec:
  podSelector:
    matchLabels: { app.kubernetes.io/name: web }
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
  egress:
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: prod }
```

**Rollback:** Delete NetworkPolicies.

---

## PR 16 — Defaults in Helm: resources, PDB, HPA

**Purpose:** Prevent noisy neighbors; ensure availability during rollouts.

**Files:**

**`charts/app/values.yaml`** (append)

```yaml
resources:
  requests: { cpu: 100m, memory: 256Mi }
  limits: { cpu: 500m, memory: 512Mi }

hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 8
  targetCPUUtilizationPercentage: 70

pdb:
  enabled: true
  minAvailable: 1
```

**`charts/app/templates/hpa.yaml`**

```yaml
{{- if .Values.hpa.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "app.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "app.fullname" . }}
  minReplicas: {{ .Values.hpa.minReplicas }}
  maxReplicas: {{ .Values.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.hpa.targetCPUUtilizationPercentage }}
{{- end }}
```

**`charts/app/templates/pdb.yaml`**

```yaml
{{- if .Values.pdb.enabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "app.fullname" . }}
spec:
  minAvailable: {{ .Values.pdb.minAvailable }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "app.name" . }}
{{- end }}
```

**Rollback:** Disable flags in values.

---

## PR 17 — Argo Rollouts Analysis (automatic canary checks)

**Purpose:** Gate canary with metrics (5xx rate, p95 latency) and roll back automatically.

**Files:**

**`k8s/argo/analysis-templates.yaml`**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: web-health }
spec:
  metrics:
    - name: error-rate
      interval: 1m
      successCondition: result < 0.02
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc.cluster.local:9090
          query: |
            sum(rate(http_requests_total{job="web",code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{job="web"}[5m]))
    - name: p95-latency
      interval: 1m
      successCondition: result < 1.5
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc.cluster.local:9090
          query: |
            histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="web"}[5m])) by (le))
```

**`charts/app/templates/rollout.yaml`** (append under canary)

```yaml
analysis:
  templates:
    - templateName: web-health
  startingStep: 1
  args: []
```

**Rollback:** Remove analysis block; keep simple step canary.

---

## PR 18 — k6 smoke/load in verify pipeline

**Purpose:** Synthetic test for the critical user journey.

**Files:**

**`load/k6/smoke.js`**

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 5, duration: '2m' };
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/healthz`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

**`.github/workflows/verify-release.yml`** (append)

```yaml
verify:
  steps:
    - uses: grafana/k6-action@v0.3.1
      with:
        filename: load/k6/smoke.js
      env:
        BASE_URL: ${{ secrets.STAGE_BASE_URL }}
```

**Rollback:** Remove k6 step.

---

## PR 19 — Infracost budget gate

**Purpose:** Fail PRs when cost delta exceeds threshold.

**Files:**

**`.github/workflows/infra-plan.yml`** (append)

```yaml
plan:
  steps:
    - uses: infracost/actions/setup@v3
    - run: infracost breakdown --path=infra --format=json --out-file=infracost.json
    - run: infracost comment github --path=infracost.json --behavior=update
    - name: Enforce budget
      run: node scripts/infracost_enforce.js
```

**`scripts/infracost_enforce.js`**

```js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('infracost.json', 'utf8'));
const delta = data.projects?.[0]?.breakdown?.totalMonthlyCost?.diff || 0;
const LIMIT = parseFloat(process.env.INFRACOST_LIMIT || '50'); // $50/month
if (delta > LIMIT) {
  console.error(`❌ Cost delta ${delta} > ${LIMIT}`);
  process.exit(1);
}
console.log(`✅ Cost delta ${delta} <= ${LIMIT}`);
```

**Rollback:** Remove enforce step; keep comments only.

---

## PR 20 — Terraform drift detection (scheduled)

**Purpose:** Catch infra drift early.

**Files:**

**`.github/workflows/infra-drift.yml`**

```yaml
name: infra-drift
on:
  schedule:
    - cron: '0 6 * * *' # daily 06:00 UTC
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -backend-config=backend.hcl
      - run: terraform plan -detailed-exitcode || echo "PLAN_EXIT=$?" >> $GITHUB_ENV
      - name: Alert on drift
        run: |
          if [ "${PLAN_EXIT}" = "2" ]; then
            echo "Drift detected" && exit 1
          fi
```

**Rollback:** Disable scheduled workflow.

---

## PR 21 — Preview environment auto‑teardown

**Purpose:** Clean up PR namespaces on close to cut costs and surface area.

**Files:**

**`.github/workflows/preview-teardown.yml`**

```yaml
name: preview-teardown
on:
  pull_request:
    types: [closed]
jobs:
  teardown:
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview namespace
        env: { KUBECONFIG: ${{ secrets.DEV_KUBECONFIG }} }
        run: |
          NS=pr-${{ github.event.pull_request.number }}
          kubectl delete ns $NS --ignore-not-found
```

**Rollback:** Disable workflow.

---

## PR 22 — Feature‑flag governance + kill switch

**Purpose:** Safer rollouts; emergency stop for risky features.

**Files:**

**`feature-flags/flags.yaml`**

```yaml
features:
  graph_reranker_v2:
    default: false
    owners: [search]
    rollout:
      stage: 10
      prod: 0
  experimental_batch_import:
    default: false
    owners: [data]
    guardrails:
      requires: ['db_migration_2025_09_gate']
```

**`scripts/ffctl.ts`**

```ts
#!/usr/bin/env ts-node
import fs from 'fs';
const flags = JSON.parse(
  JSON.stringify(require('../feature-flags/flags.yaml')),
);
const [name, value] = process.argv.slice(2);
if (!flags.features[name]) throw new Error('Unknown flag');
flags.features[name].default = value === 'true';
fs.writeFileSync('feature-flags/flags.yaml', flags);
console.log(`Set ${name}=${value}`);
```

**`.github/workflows/flags-promote.yml`**

```yaml
name: flags-promote
on: workflow_dispatch
jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/ffctl.ts graph_reranker_v2 true
```

**Rollback:** Set defaults to `false`; run `ffctl` to disable.

---

# Cutover Sequence (half day)

1. Install **policy‑controller** and **Kyverno** with `validationFailureAction: audit`.
2. Merge CI changes to produce signatures + SLSA; verify allow in audit mode.
3. Flip policies to **enforce**.
4. Deploy **AnalysisTemplates**; test canary with synthetic k6 + Prometheus gate.
5. Enable **preview-teardown** and **infra-drift** schedules.
6. Set **Infracost** threshold to a conservative value (e.g., $25/month delta) and tune.

# Rollback

- All policies can be set to `audit` or removed; rollouts analysis can be disabled without redeploying images. CI changes are additive; simply disable steps.

# Ownership

- **Platform:** PR 11, 13–17, 21
- **CI/Supply chain:** PR 12, 19–20
- **FinOps:** PR 19
- **Release/QA:** PR 17–18, 22
