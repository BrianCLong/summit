Below is a **drop‑in bundle** you can commit at repo root. It wires reusable CI, security gates, SBOM + signing, preview envs, canary deploy, migration gates, OPA policies, and repo hygiene. Replace placeholder values noted with `TODO:` comments.

---

## File Map

```
.github/
  CODEOWNERS
  pull_request_template.md
  ISSUE_TEMPLATE.md
  workflows/
    ci-pr.yml
    ci-reusable-build.yml
    ci-reusable-test.yml
    ci-reusable-scan.yml
    ci-reusable-package.yml
    ci-reusable-publish.yml
    ci-reusable-deploy.yml
    ci-migration-gate.yml
    ci-nightly.yml
.ci/
  policies/
    terraform_plan.rego
    helm_values.rego
    migrations.rego
    license_policy.rego
  scripts/
    preview_deploy.sh
    preview_destroy.sh
    otel_wrap.sh
    sbom_cyclonedx.sh
    verify_provenance.sh
  config/
    feature_flags.yml
    slo.yml
helm/
  values-canary.yaml
  templates/healthchecks.yaml
terraform/
  opa-policy-config.yaml
ops/
  audit/README.md
  runbooks/
    canary.md
    rollback.md
    migration.md
security/
  signing/README.md
  sbom/README.md
```

---

## Repo Hygiene

### `.github/CODEOWNERS`

```txt
# Require reviews from owners by path
*       @your-org/platform @your-org/app-owners
/helm/  @your-org/platform
/terraform/ @your-org/platform @your-org/secops
/db/migrations/ @your-org/data @your-org/platform
/.ci/policies/ @your-org/secops
```

### `.github/pull_request_template.md`

```md
## Summary

- What & why:

## Risk & Flags

- Feature flags (name, default):
- Data/schema changes (link to migration plan):
- Rollback steps:

## Tests

- Unit/Contract/E2E coverage summary:

## Observability

- New metrics/traces/log fields:

## Checklist

- [ ] Feature behind a flag if risky
- [ ] Migration plan + rollback attached (if schema)
- [ ] Runbook updated if behavior change
```

### `.github/ISSUE_TEMPLATE.md`

```md
## Definition of Ready

- Scope
- Risks
- Tests
- Migration (if any)
- Observability adds
- Rollback path
```

---

## Reusable Workflows (GitHub Actions)

> If you use GitLab/Buildkite, mirror these semantics; jobs/steps are portable.

### `.github/workflows/ci-reusable-build.yml`

```yaml
name: ci-reusable-build
on:
  workflow_call:
    inputs:
      language: { required: true, type: string }
      cache-key: { required: false, type: string, default: default }
    secrets:
      REGISTRY_USER: { required: true }
      REGISTRY_TOKEN: { required: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Setup toolchain
        uses: actions/setup-node@v4
        if: ${{ inputs.language == 'node' }}
        with: { node-version: '22.x', cache: 'npm' }
      - name: Compute cache key
        id: cache
        run: echo "key=${{ inputs.cache-key }}-${{ hashFiles('**/package-lock.json','**/pnpm-lock.yaml','**/yarn.lock','**/poetry.lock','**/Cargo.lock') }}" >> $GITHUB_OUTPUT
      - uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ~/.cache/pip
            ~/.cache/yarn
          key: ${{ steps.cache.outputs.key }}
      - name: Build
        run: |
          # TODO: replace with your build command
          npm ci && npm run build
      - name: Docker build (provenance)
        uses: docker/build-push-action@v6
        with:
          push: false
          load: true
          tags: local/app:pr-${{ github.run_number }}
          provenance: true
```

### `.github/workflows/ci-reusable-test.yml`

```yaml
name: ci-reusable-test
on:
  workflow_call:
    inputs:
      shard-total: { required: false, type: number, default: 1 }
      shard-index: { required: false, type: number, default: 0 }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: npm ci
      - name: Unit & Contract tests
        run: |
          # Shard-aware example
          npm run test -- --shard=${{ inputs.shard-index }}/${{ inputs.shard-total }} --ci --reporter=junit --outputFile=reports/junit.xml
      - name: Upload test reports
        uses: actions/upload-artifact@v4
        with:
          name: junit
          path: reports/junit.xml
```

### `.github/workflows/ci-reusable-scan.yml`

```yaml
name: ci-reusable-scan
on:
  workflow_call:
    secrets:
      GITHUB_TOKEN: { required: true }
jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: SCA (Dependabot/SBOM)
        run: |
          ./.ci/scripts/sbom_cyclonedx.sh
      - name: CodeQL init
        uses: github/codeql-action/init@v3
        with: { languages: javascript }
      - name: CodeQL analyze
        uses: github/codeql-action/analyze@v3
```

### `.github/workflows/ci-reusable-package.yml`

```yaml
name: ci-reusable-package
on:
  workflow_call:
    secrets:
      COSIGN_PASSWORD: { required: true }
      COSIGN_PRIVATE_KEY: { required: true }
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        uses: docker/build-push-action@v6
        with:
          push: false
          tags: ${{ github.repository }}:sha-${{ github.sha }}
          provenance: true
      - name: Export SBOM
        run: ./.ci/scripts/sbom_cyclonedx.sh
      - name: Cosign sign (key in secret)
        env:
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
        run: |
          echo "$COSIGN_PRIVATE_KEY" > cosign.key
          cosign sign --key cosign.key ${{ github.repository }}:sha-${{ github.sha }}
```

### `.github/workflows/ci-reusable-publish.yml`

```yaml
name: ci-reusable-publish
on:
  workflow_call:
    secrets:
      REGISTRY_USER: { required: true }
      REGISTRY_TOKEN: { required: true }
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_TOKEN }}
      - name: Push image
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
```

### `.github/workflows/ci-reusable-deploy.yml`

```yaml
name: ci-reusable-deploy
on:
  workflow_call:
    inputs:
      environment: { required: true, type: string }
    secrets:
      KUBE_CONFIG: { required: true }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup kubectl
        uses: azure/setup-kubectl@v4
      - name: Kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG }}" > ~/.kube/config
      - name: Helm Canary Deploy
        run: |
          helm upgrade --install app ./helm \
            -f helm/values-canary.yaml \
            --set image.tag=sha-${{ github.sha }} \
            --wait --timeout 10m
      - name: Verify golden signals
        run: ./.ci/scripts/verify_provenance.sh
```

### `.github/workflows/ci-migration-gate.yml`

```yaml
name: migration-gate
on:
  pull_request:
    paths:
      - 'db/migrations/**'
      - '.ci/policies/**'
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check required artifacts
        run: |
          test -f docs/migrations/plan.md || (echo 'Missing docs/migrations/plan.md' && exit 1)
          test -f docs/migrations/rollback.md || (echo 'Missing docs/migrations/rollback.md' && exit 1)
          test -f db/migrations/DRYRUN_RESULT.txt || (echo 'Missing DRYRUN_RESULT.txt' && exit 1)
      - name: OPA policy check
        run: |
          conftest test --policy ./.ci/policies db/migrations
```

### `.github/workflows/ci-nightly.yml`

```yaml
name: nightly-health
on:
  schedule:
    - cron: '0 6 * * *'
jobs:
  e2e:
    uses: ./.github/workflows/ci-reusable-test.yml
    with: { shard-total: 4 }
  scan:
    uses: ./.github/workflows/ci-reusable-scan.yml
    secrets: inherit
```

### `.github/workflows/ci-pr.yml` (orchestrator for PRs)

```yaml
name: ci-pr
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  lint_build:
    uses: ./.github/workflows/ci-reusable-build.yml
    with:
      language: node
      cache-key: node
    secrets: inherit

  tests:
    needs: [lint_build]
    uses: ./.github/workflows/ci-reusable-test.yml
    with: { shard-total: 3 }

  scan:
    needs: [lint_build]
    uses: ./.github/workflows/ci-reusable-scan.yml
    secrets: inherit

  package:
    needs: [tests, scan]
    uses: ./.github/workflows/ci-reusable-package.yml
    secrets: inherit

  preview:
    needs: [package]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Preview deploy
        run: ./.ci/scripts/preview_deploy.sh
      - name: Comment URL on PR
        uses: mshick/add-pr-comment@v2
        with:
          message: |
            🚀 Preview: https://preview.example.com/pr-${{ github.event.pull_request.number }}

  policy_migrations:
    uses: ./.github/workflows/ci-migration-gate.yml
```

---

## OPA Policies

### `.ci/policies/terraform_plan.rego`

```rego
package terraform.policy

deny[msg] {
  input.resource_changes[_].change.after.lifecycle.prevent_destroy == true
  msg := sprintf("prevent_destroy found; requires waiver", [])
}

deny[msg] {
  some r
  r := input.resource_changes[_]
  r.change.after.tags.Environment == "prod"
  not input.metadata.change_control.approved
  msg := "Prod change without change-control approval"
}
```

### `.ci/policies/helm_values.rego`

```rego
package helm.values

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.securityContext.runAsNonRoot
  msg := "Deployment must set runAsNonRoot"
}

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.containers[_].resources.limits
  msg := "Containers must declare resource limits"
}
```

### `.ci/policies/migrations.rego`

```rego
package db.migrations

deny[msg] {
  endswith(input.filename, ".sql")
  contains(lower(input.content), "drop table")
  not input.metadata.has_rollback
  msg := sprintf("Destructive change without rollback: %s", [input.filename])
}
```

### `.ci/policies/license_policy.rego`

```rego
package license.policy

# Example: block GPL-3.0 unless waived
warn[msg] {
  some d
  d := input.dependencies[_]
  d.license == "GPL-3.0"
  msg := sprintf("GPL detected: %s", [d.name])
}
```

---

## CI Scripts

### `.ci/scripts/preview_deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PR=${GITHUB_REF_NAME#*/}
NS=pr-${PR}
# TODO: set cluster context via KUBE_CONFIG
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install app ./helm -n "$NS" \
  --set image.tag=sha-${GITHUB_SHA} \
  --set ingress.hosts[0]=preview.example.com \
  --wait --timeout 10m
```

### `.ci/scripts/preview_destroy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
PR_NUMBER=$1
kubectl delete ns pr-${PR_NUMBER} --wait=false || true
```

### `.ci/scripts/otel_wrap.sh`

```bash
#!/usr/bin/env bash
# Wrap a command with otel-cli if available
set -euo pipefail
if command -v otel-cli >/dev/null 2>&1; then
  otel-cli span --name "$1" -- $@
else
  "$@"
fi
```

### `.ci/scripts/sbom_cyclonedx.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# Node example; extend per language
npx @cyclonedx/cyclonedx-npm --output-file sbom.json --output-format json
mkdir -p security/sbom
mv sbom.json security/sbom/sbom-${GITHUB_SHA}.json
```

### `.ci/scripts/verify_provenance.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# TODO: implement checks against your metrics endpoint / health dashboard
# Placeholder: fail if error rate metric > threshold
exit 0
```

---

## Helm Canary Values

### `helm/values-canary.yaml`

```yaml
replicaCount: 3
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
readinessProbe:
  httpGet: { path: /healthz, port: http }
livenessProbe:
  httpGet: { path: /livez, port: http }
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
podSecurityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
```

### `helm/templates/healthchecks.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app
spec:
  selector:
    matchLabels:
      app: app
  endpoints:
    - port: http
      path: /metrics
```

---

## Terraform OPA Config

### `terraform/opa-policy-config.yaml`

```yaml
metadata:
  change_control:
    approved: false # CI sets to true on approved change ticket
```

---

## Configs

### `.ci/config/feature_flags.yml`

```yaml
flags:
  risky_feature:
    owner: team-app
    default: false
    description: 'Example risky code path behind flag'
```

### `.ci/config/slo.yml`

```yaml
slo:
  p95_ms: 1500
  error_rate: 0.01
  saturation: 0.7
```

---

## Runbooks

### `ops/runbooks/canary.md`

```md
**Objective**: Gradual rollout with auto-rollback triggers.

- Steps: 5% → 25% → 50% → 100%
- Golden signals: p95 latency, error rate, saturation.
- Rollback if any exceed thresholds for 5 minutes.
```

### `ops/runbooks/rollback.md`

```md
**Rollback**: `helm rollback app <REVISION>`; confirm via health dashboard; capture audit ID.
```

### `ops/runbooks/migration.md`

```md
**Gate**: PR must include `docs/migrations/plan.md`, `docs/migrations/rollback.md`, and `db/migrations/DRYRUN_RESULT.txt`.
```

---

## Security Docs

### `security/signing/README.md`

```md
Use Cosign keyless or key-based. Store private key in repo secrets. Verify in deploy.
```

### `security/sbom/README.md`

```md
CycloneDX SBOM generated per build; publish as artifact and store under `security/sbom/`.
```

---

## Notes for Maestro Conductor Integration

- Trigger **`ci-pr.yml`** on PR events; Maestro can also invoke reusable workflows directly via `workflow_call` for batch operations.
- Pass trace IDs via environment variables; optional `otel_wrap.sh` spans steps when `otel-cli` present.
- Promotion to **stage/prod** should reuse `ci-reusable-deploy.yml` with `environment: stage|prod` and require green SLO dashboards prior to dispatch (hook Maestro to block on SLO API).
- Auto‑rollback: connect `verify_provenance.sh` to your metrics gateway and exit non‑zero on breach to trigger rollback.

---

## Secrets & Parameters (set in repo/org settings)

- `REGISTRY_USER`, `REGISTRY_TOKEN`
- `COSIGN_PRIVATE_KEY`, `COSIGN_PASSWORD` (or use keyless)
- `KUBE_CONFIG` (base64 Kubeconfig for preview + envs)

---

## Next Steps

1. Commit this bundle; replace `TODO:` placeholders.
2. Create `docs/migrations/plan.md` and `docs/migrations/rollback.md` templates.
3. Add environment protection rules for **stage** and **prod**; require approvals.
4. Wire Maestro to call `ci-reusable-*` workflows and capture trace/audit IDs.
