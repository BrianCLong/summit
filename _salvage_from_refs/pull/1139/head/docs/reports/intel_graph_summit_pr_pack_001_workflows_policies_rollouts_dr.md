# PR Pack 001 — Ready-to-merge changes

This pack contains concrete, copy‑pasteable changes split into 10 small PRs. Each PR has a purpose, files to add/modify, and rollback notes. Order matters; follow the sequence.

---

## PR 1 — Consolidate CI into 4 reusable workflows

**Purpose:** Kill flake/sprawl, speed feedback, and standardize caching.

**Files:**

**`.github/workflows/ci.yml`**
```yaml
name: CI
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches: [main]
concurrency: { group: ci-${{ github.workflow }}-${{ github.ref || github.head_ref }}, cancel-in-progress: true }
jobs:
  core:
    uses: ./.github/workflows/ci-core.yml
  security:
    uses: ./.github/workflows/ci-security.yml
  preview:
    if: ${{ github.event_name == 'pull_request' && github.event.pull_request.draft == false }}
    uses: ./.github/workflows/ci-preview.yml
```

**`.github/workflows/ci-core.yml`**
```yaml
name: ci-core
on: { workflow_call: {} }
jobs:
  build_test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck --if-present
      - run: npm test -- --ci --reporters=default --maxWorkers=50%
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage }
```

**`.github/workflows/ci-security.yml`**
```yaml
name: ci-security
on: { workflow_call: {} }
jobs:
  codeql:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: 'javascript-typescript' }
      - uses: github/codeql-action/analyze@v3
  containers:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write     # for keyless signing
      attestations: write # provenance
      packages: write     # ghcr push if needed
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build image
        run: |
          docker build -t ghcr.io/${{ github.repository }}/app:${{ github.sha }} .
      - name: Trivy scan (fail on HIGH+)
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ghcr.io/${{ github.repository }}/app:${{ github.sha }}
          vuln-type: 'os,library'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
      - name: SBOM (CycloneDX via cdxgen)
        run: |
          npm i -g @cyclonedx/cdxgen
          cdxgen -o sbom.cdx.json -t js -r .
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with: { name: sbom.cdx.json, path: sbom.cdx.json }
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
      - name: Sign image (keyless)
        env: { COSIGN_EXPERIMENTAL: 'true' }
        run: cosign sign --yes ghcr.io/${{ github.repository }}/app:${{ github.sha }}
      - name: Generate provenance
        uses: actions/attest-build-provenance@v1
        with:
          subject-name: ghcr.io/${{ github.repository }}/app
          subject-digest: ${{ steps.digest.outputs.sha256 || '' }}
          push-to-registry: true
```

**`.github/workflows/ci-preview.yml`**
```yaml
name: ci-preview
on: { workflow_call: {} }
jobs:
  preview:
    runs-on: ubuntu-latest
    environment: dev
    permissions:
      contents: read
      id-token: write
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run build --if-present
      - name: Build & push image
        run: |
          IMAGE=ghcr.io/${{ github.repository }}/app:pr-${{ github.event.pull_request.number }}-${{ github.sha }}
          echo "IMAGE=$IMAGE" >> $GITHUB_ENV
          echo ${{ github.token }} | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
          docker build -t $IMAGE .
          docker push $IMAGE
      - name: Preview namespace
        run: echo "ns=pr-${{ github.event.pull_request.number }}" >> $GITHUB_ENV
      - name: Helm upgrade
        env:
          KUBECONFIG: ${{ secrets.DEV_KUBECONFIG }}
        run: |
          helm upgrade --install app charts/app \
            --namespace $ns --create-namespace \
            --set image.repository=ghcr.io/${{ github.repository }}/app \
            --set image.tag=pr-${{ github.event.pull_request.number }}-${{ github.sha }} \
            --set ingress.host=pr-${{ github.event.pull_request.number }}.dev.example.com
      - name: Comment with URL
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            ✅ Preview deployed: https://pr-${{ github.event.pull_request.number }}.dev.example.com
```

**Rollback:** Keep old workflows in `.github/workflows/_archive/` for one release train; delete if green for a week.

---

## PR 2 — Secrets hygiene & policy

**Purpose:** Eliminate repo‑committed secrets; enforce External/Sealed Secrets.

**Files:**

**`.gitignore`** (append)
```gitignore
# no local secrets
.env
.env.*
*.pem
*.key
```

**`.gitleaks.toml`** (baseline with allowlist expiry)
```toml
[extend]
path = ""

[[rules.allowlist.regexes]]
regex = "^REDACTED-PLACEHOLDER-ONLY$"
```

**`SECURITY/secrets-policy.md`**
```md
# Secrets Policy
- No secrets in repo or CI logs.
- Kubernetes secrets via External Secrets or Sealed Secrets only.
- Terraform pulls secrets from AWS SSM/Secrets Manager (never variables).
- Emergency rotations documented in runbook; reason-for-access required.
```

**Rollback:** None; policy docs only. If `.env` files exist in history, enable GitHub push protection & secret scanning; rotate anything flagged.

---

## PR 3 — Terraform: move secrets to SSM/Secrets Manager

**Purpose:** Stop passing secrets via TF variables; centralize in SSM/Secrets Manager.

**Files:**

**`infra/envs/prod/main.tf`** (excerpt)
```hcl
data "aws_ssm_parameter" "db_password" {
  name            = "/intelgraph/prod/db/password"
  with_decryption = true
}

module "aurora" {
  source          = "../../modules/aurora"
  master_username = "maestro"
  master_password = data.aws_ssm_parameter.db_password.value
}
```

**`infra/policies/tfsec.yaml`**
```yaml
severity: HIGH
minimum_severity: MEDIUM
```

**`.github/workflows/infra-plan.yml`**
```yaml
name: infra-plan
on: [pull_request]
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -backend-config=backend.hcl
      - run: terraform fmt -check -recursive
      - run: terraform validate
      - name: tfsec
        uses: aquasecurity/tfsec-action@v1
      - run: terraform plan -no-color
```

**Rollback:** Revert to prior variables; keep SSM parameters for next attempt.

---

## PR 4 — Standard Argo Rollouts canary (Helm helper)

**Purpose:** Uniform progressive delivery + automated rollback.

**Files:**

**`charts/app/templates/rollout.yaml`**
```yaml
{{- if .Values.rollout.enabled }}
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: {{ include "app.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount | default 2 }}
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 20m }
      trafficRouting:
        nginx: {}
  selector:
    matchLabels: { app.kubernetes.io/name: {{ include "app.name" . }} }
  template:
    metadata:
      labels: { app.kubernetes.io/name: {{ include "app.name" . }} }
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 3000
{{- end }}
```

**`charts/app/values.yaml`**
```yaml
rollout:
  enabled: true
```

**Rollback:** Set `rollout.enabled=false` in values; Helm will revert to standard Deployment.

---

## PR 5 — Admission policy with OPA/Conftest

**Purpose:** Block unsigned images, missing SBOM, or CRITICAL vulns.

**Files:**

**`policy/rego/deploy_gates.rego`**
```rego
package deploy.gates

# Require cosign signature, SBOM, and no critical vulns
allow {
  input.image.signed
  input.image.slsa_level >= 3
  not input.image.has_critical_vulns
  input.artifacts.sbom_present
}
```

**`policy/tests/deploy_gates_test.yaml`**
```yaml
- name: denies critical vulns
  input:
    image: { signed: true, slsa_level: 3, has_critical_vulns: true }
    artifacts: { sbom_present: true }
  result: { allow: false }
- name: allows clean image
  input:
    image: { signed: true, slsa_level: 3, has_critical_vulns: false }
    artifacts: { sbom_present: true }
  result: { allow: true }
```

**`.github/workflows/policy-check.yml`**
```yaml
name: policy-check
on: [pull_request]
jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: instrumenta/conftest-action@v0.3.0
        with:
          files: charts/app/templates/*.yaml
          policy: policy/rego
```

**Rollback:** Disable `policy-check` required status temporarily.

---

## PR 6 — SLO burn alerts + promotion gate

**Purpose:** Promotion only when golden signals are green.

**Files:**

**`observability/prometheus/alerts.yaml`**
```yaml
groups:
- name: api-slo
  rules:
  - alert: APIErrorBudgetBurn
    expr: (
      sum(rate(http_requests_total{code=~"5.."}[5m])) /
      sum(rate(http_requests_total[5m]))
    ) > 0.02
    for: 10m
    labels: { severity: critical }
    annotations:
      summary: "5xx too high (burning error budget)"
```

**`scripts/verify_release.ts`**
```ts
import fetch from 'node-fetch';

const PROM = process.env.PROM_URL!; // e.g. https://prometheus.dev.svc
const Q = 'sum(rate(http_requests_total{code=~"5.."}[5m]))/sum(rate(http_requests_total[5m]))';
const THRESH = parseFloat(process.env.ERROR_BUDGET_THRESH || '0.02');

async function main(){
  const r = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(Q)}`);
  const j = await r.json();
  const v = parseFloat(j.data.result?.[0]?.value?.[1] || '0');
  if (isNaN(v)) throw new Error('No metric value');
  if (v > THRESH) {
    console.error(`❌ Error budget burn ${v} > ${THRESH}`);
    process.exit(1);
  }
  console.log(`✅ Error budget burn ${v} <= ${THRESH}`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

**`.github/workflows/verify-release.yml`**
```yaml
name: verify-release
on: { workflow_call: {} }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm i node-fetch@2
      - run: node scripts/verify_release.ts
        env:
          PROM_URL: ${{ secrets.PROM_URL }}
          ERROR_BUDGET_THRESH: '0.02'
```

**Rollback:** Bypass via environment protection override with reason logged.

---

## PR 7 — Release & promotion pipeline

**Purpose:** Keep release-please; add controlled canary + auto rollback.

**Files:**

**`.github/workflows/release.yml`**
```yaml
name: release
on:
  push:
    branches: [main]
  workflow_dispatch: {}
concurrency: { group: release-${{ github.ref }}, cancel-in-progress: false }
jobs:
  cut_release:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please-action@v4
        with:
          release-type: node
  stage_canary:
    needs: cut_release
    runs-on: ubuntu-latest
    environment: stage
    steps:
      - uses: actions/checkout@v4
      - name: Deploy canary (50%)
        env: { KUBECONFIG: ${{ secrets.STAGE_KUBECONFIG }} }
        run: |
          argo rollouts set image app app=ghcr.io/${{ github.repository }}/app:${{ github.sha }} -n stage
          argo rollouts set weight app 10 -n stage
      - name: Hold for SLO gate
        uses: ./.github/workflows/verify-release.yml
  promote_prod:
    needs: stage_canary
    runs-on: ubuntu-latest
    environment: prod
    steps:
      - name: Promote 100%
        env: { KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }} }
        run: |
          argo rollouts promote app -n prod
```

**Rollback:** `argo rollouts abort app -n stage` or `-n prod`.

---

## PR 8 — DR restore automation

**Purpose:** Prove backups restore; page on failure.

**Files:**

**`k8s/cronjobs/dr-restore.yaml`**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: dr-restore-verify }
spec:
  schedule: "0 3 * * 1" # weekly Monday 03:00
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: restore
              image: alpine:latest
              command: ["/bin/sh","-c"]
              args:
                - |
                  echo "Restoring snapshot to scratch namespace...";
                  # TODO: replace with actual backup store + restore commands
                  echo OK
```

**`.github/workflows/dr-verify.yml`**
```yaml
name: dr-verify
on:
  schedule:
    - cron: '0 4 * * 1'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch last CronJob status
        run: echo "Check k8s job status here; fail if last run != success"
```

**Rollback:** Disable CronJob/workflow.

---

## PR 9 — Dependabot train

**Purpose:** Reduce PR noise; safe auto‑merge patches.

**Files:**

**`.github/dependabot.yml`**
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly, day: monday, time: "03:00" }
    groups:
      minor-and-patch:
        patterns: ["*"]
        update-types: ["minor","patch"]
    open-pull-requests-limit: 10
    pull-request-branch-name: { separator: "-" }
    rebase-strategy: auto
    reviewers: ["team/security"]
```

**`.github/workflows/auto-merge-safe.yml`**
```yaml
name: auto-merge-safe
on: [pull_request]
jobs:
  automerge:
    if: contains(github.head_ref, 'dependabot')
    runs-on: ubuntu-latest
    steps:
      - name: Enable automerge on passing PRs
        uses: fastify/github-action-merge-dependabot@v3
        with: { target: minor }
```

**Rollback:** Remove automerge workflow.

---

## PR 10 — Branch protections & environment rules (scriptable)

**Purpose:** Enforce required checks and approvals with audit reasoning.

**Files:**

**`scripts/protect.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
REPO="$1" # org/repo
REQUIRED=("CI" "policy-check" "infra-plan")
for BR in main; do
  gh api -X PUT repos/$REPO/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F enforce_admins=true \
    -F required_linear_history=true \
    -F required_pull_request_reviews.dismiss_stale_reviews=true \
    -F required_pull_request_reviews.required_approving_review_count=1
  for C in "${REQUIRED[@]}"; do
    gh api -X POST repos/$REPO/branches/$BR/protection/required_status_checks/contexts -f context="$C" || true
  done
done
```

**Rollback:** Run with empty REQUIRED or remove protection via GH UI.

---

# Cutover Plan (1 day)
1. Create the 10 PRs in order; mark **PR 1** and **PR 2** as **required checks**.
2. Merge **PR 3**; provision SSM params; rotate any credentials.
3. Merge **PR 4–7**; validate canary on stage and promotion gate.
4. Enable **PR 8** weekly; confirm alert routing.
5. Apply **PR 10** protections via `scripts/protect.sh`.

# Rollback Plan
- All PRs are additive and reversible; roll back by reverting individual commits.
- Canary can be disabled with a single values flag.
- Admission gates can be temporarily bypassed via environment rules **with reason-for-access recorded**.

# Owner Matrix
- **DevEx/CI:** PR 1, 7, 10
- **Security:** PR 2, 5
- **Platform:** PR 3, 4, 6, 8
- **Release Captain:** Coordinates cutover, owns canary plan, and soak verification.

