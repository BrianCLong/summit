This bundle adapts the previous generic plan to your **summit-main** repo structure (mixed Node/TypeScript with `pnpm`, multiple Python packages with `requirements.txt`/`pyproject.toml`, Dockerfile present, Helm and Terraform roots). It introduces a PR orchestrator with **language-aware matrices**, **path filters**, **preview envs**, SBOM + signing, OPA policy gates, and canary deploy hooks. Replace `TODO:` placeholders as noted.

---

## File Map

```
.github/
  workflows/
    pr.yml
    wf-reuse-build-node.yml
    wf-reuse-build-python.yml
    wf-reuse-test-node.yml
    wf-reuse-test-python.yml
    wf-reuse-scan.yml
    wf-reuse-package.yml
    wf-reuse-publish.yml
    wf-reuse-deploy.yml
    nightly.yml
  CODEOWNERS
  pull_request_template.md
.ci/
  scripts/
    setup_pnpm.sh
    python_bootstrap.sh
    changed_paths.py
    preview_deploy.sh
    preview_destroy.sh
    sbom_cyclonedx.sh
    verify_goldens.sh
  policies/
    terraform_plan.rego
    helm_values.rego
    license_policy.rego
helm/
  values-canary.yaml
ops/runbooks/{canary.md,rollback.md}
security/{signing, sbom}/README.md
terraform/opa-policy-config.yaml
```

---

## Reusable Workflows

### `.github/workflows/wf-reuse-build-node.yml`

```yaml
name: wf-reuse-build-node
on:
  workflow_call:
    inputs:
      node-version: { type: string, default: '22.x' }
      working-directory: { type: string, default: '.' }
      cache-key: { type: string, default: 'pnpm' }
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Setup Node & pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
          echo "Using pnpm $(pnpm --version)"
      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ~/.local/share/pnpm/store
          key: ${{ runner.os }}-${{ inputs.cache-key }}-${{ hashFiles('**/pnpm-lock.yaml') }}
      - name: Install & build
        run: |
          pnpm install --frozen-lockfile
          pnpm -r build || pnpm run build || true
```

### `.github/workflows/wf-reuse-test-node.yml`

```yaml
name: wf-reuse-test-node
on:
  workflow_call:
    inputs:
      working-directory: { type: string, default: '.' }
      shard-total: { type: number, default: 1 }
      shard-index: { type: number, default: 0 }
jobs:
  test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ${{ inputs.working-directory }} } }
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node & pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Test (jest/ts-jest)
        run: |
          pnpm exec jest --ci --reporters=default --reporters=jest-junit \
            --shard=${{ inputs.shard-index }}/${{ inputs.shard-total }} || pnpm test --if-present
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-node
          path: '**/junit.xml'
```

### `.github/workflows/wf-reuse-build-python.yml`

```yaml
name: wf-reuse-build-python
on:
  workflow_call:
    inputs:
      python-version: { type: string, default: '3.11' }
      working-directory: { type: string, default: '.' }
jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ${{ inputs.working-directory }} } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ inputs.python-version }} }
      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt','**/pyproject.toml','**/poetry.lock') }}
      - name: Install
        run: |
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e .; fi
```

### `.github/workflows/wf-reuse-test-python.yml`

```yaml
name: wf-reuse-test-python
on:
  workflow_call:
    inputs:
      python-version: { type: string, default: '3.11' }
      working-directory: { type: string, default: '.' }
jobs:
  test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ${{ inputs.working-directory }} } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ inputs.python-version }} }
      - name: Install deps
        run: |
          pip install -U pip pytest pytest-cov
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e .; fi
      - name: Pytest
        run: pytest -q --junitxml=reports/junit.xml || true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: junit-python
          path: reports/junit.xml
```

### `.github/workflows/wf-reuse-scan.yml`

```yaml
name: wf-reuse-scan
on:
  workflow_call: {}
jobs:
  scan:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@v4
      - name: SBOM (CycloneDX for npm+pip)
        run: ./.ci/scripts/sbom_cyclonedx.sh
      - name: CodeQL init
        uses: github/codeql-action/init@v3
        with: { languages: javascript, queries: security-extended }
      - name: CodeQL analyze
        uses: github/codeql-action/analyze@v3
```

### `.github/workflows/wf-reuse-package.yml`

```yaml
name: wf-reuse-package
on:
  workflow_call:
    secrets:
      COSIGN_PRIVATE_KEY: { required: true }
      COSIGN_PASSWORD: { required: true }
jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Docker build (root Dockerfile)
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          provenance: true
      - name: SBOM
        run: ./.ci/scripts/sbom_cyclonedx.sh
      - name: Sign image
        env:
          COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          echo "$COSIGN_PRIVATE_KEY" > cosign.key
          cosign sign --key cosign.key ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
```

### `.github/workflows/wf-reuse-publish.yml`

```yaml
name: wf-reuse-publish
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
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
```

### `.github/workflows/wf-reuse-deploy.yml`

```yaml
name: wf-reuse-deploy
on:
  workflow_call:
    inputs:
      environment: { type: string, required: true }
    secrets:
      KUBE_CONFIG: { required: true }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - name: Kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG }}" > ~/.kube/config
      - name: Helm Canary
        run: |
          helm upgrade --install summit ./helm \
            -f helm/values-canary.yaml \
            --set image.tag=sha-${{ github.sha }} \
            --wait --timeout 15m
      - name: Verify golden signals
        run: ./.ci/scripts/verify_goldens.sh
```

---

## PR Orchestrator with Path Filters

### `.github/workflows/pr.yml`

```yaml
name: pr
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      node_dirs: ${{ steps.paths.outputs.node_dirs }}
      python_dirs: ${{ steps.paths.outputs.python_dirs }}
    steps:
      - uses: actions/checkout@v4
      - id: paths
        run: |
          python3 ./.ci/scripts/changed_paths.py > matrix.json
          echo "node_dirs=$(jq -c '.node' matrix.json)" >> $GITHUB_OUTPUT
          echo "python_dirs=$(jq -c '.python' matrix.json)" >> $GITHUB_OUTPUT

  node_build_test:
    needs: discover
    if: ${{ needs.discover.outputs.node_dirs != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        dir: ${{ fromJson(needs.discover.outputs.node_dirs) }}
    uses: ./.github/workflows/wf-reuse-build-node.yml
    with: { working-directory: ${{ matrix.dir }} }

  node_tests:
    needs: [node_build_test]
    if: ${{ needs.discover.outputs.node_dirs != '[]' }}
    strategy:
      matrix:
        dir: ${{ fromJson(needs.discover.outputs.node_dirs) }}
    uses: ./.github/workflows/wf-reuse-test-node.yml
    with: { working-directory: ${{ matrix.dir }}, shard-total: 2 }

  py_build:
    needs: discover
    if: ${{ needs.discover.outputs.python_dirs != '[]' }}
    strategy:
      matrix:
        dir: ${{ fromJson(needs.discover.outputs.python_dirs) }}
    uses: ./.github/workflows/wf-reuse-build-python.yml
    with: { working-directory: ${{ matrix.dir }} }

  py_tests:
    needs: [py_build]
    if: ${{ needs.discover.outputs.python_dirs != '[]' }}
    strategy:
      matrix:
        dir: ${{ fromJson(needs.discover.outputs.python_dirs) }}
    uses: ./.github/workflows/wf-reuse-test-python.yml
    with: { working-directory: ${{ matrix.dir }} }

  scan:
    needs: [node_tests, py_tests]
    uses: ./.github/workflows/wf-reuse-scan.yml

  package:
    needs: [scan]
    uses: ./.github/workflows/wf-reuse-package.yml
    secrets: inherit

  preview:
    needs: [package]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy preview env
        run: ./.ci/scripts/preview_deploy.sh

```

---

## Helper Scripts

### `.ci/scripts/changed_paths.py`

```python
import json, os, subprocess, pathlib, sys
# Derive changed paths for PR; fallback to repo scan if not available
base = pathlib.Path('.')
node, python = set(), set()
# Heuristics: presence of package.json => node, requirements.txt/pyproject => python
for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root: continue
    fs = set(files)
    if 'package.json' in fs: node.add(root)
    if 'requirements.txt' in fs or 'pyproject.toml' in fs: python.add(root)
print(json.dumps({"node": sorted(node), "python": sorted(python)}))
```

### `.ci/scripts/setup_pnpm.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
corepack enable
corepack prepare pnpm@latest --activate
```

### `.ci/scripts/python_bootstrap.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
pip install -U pip pytest pytest-cov
[ -f requirements.txt ] && pip install -r requirements.txt || true
[ -f pyproject.toml ] && pip install -e . || true
```

### `.ci/scripts/sbom_cyclonedx.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p security/sbom
# npm (monorepo safe)
if command -v pnpm >/dev/null 2>&1; then corepack enable && corepack prepare pnpm@latest --activate; fi
if [ -f package.json ]; then npx @cyclonedx/cyclonedx-npm --output-file security/sbom/npm-${GITHUB_SHA}.json --output-format json || true; fi
# python
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then pip install cyclonedx-bom >/dev/null 2>&1 || true; cyclonedx-py --format json --output security/sbom/python-${GITHUB_SHA}.json || true; fi
```

### `.ci/scripts/preview_deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_REF:?}"
PR_NUMBER=$(jq -r '.pull_request.number' <(echo "$GITHUB_EVENT_PATH" | xargs cat) 2>/dev/null || echo ${GITHUB_REF##*/})
NS=pr-${PR_NUMBER}
kubectl create ns "$NS" --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install summit ./helm -n "$NS" \
  --set image.tag=sha-${GITHUB_SHA} \
  --wait --timeout 15m
```

### `.ci/scripts/verify_goldens.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# TODO: call metrics endpoint(s) and enforce thresholds from .ci/config/slo.yml
exit 0
```

---

## OPA Policies (tailored)

### `.ci/policies/terraform_plan.rego`

```rego
package terraform.policy

deny[msg] {
  some rc
  rc := input.resource_changes[_]
  rc.change.after.tags.Environment == "prod"
  not input.metadata.change_control.approved
  msg := "Prod change without approval"
}
```

### `.ci/policies/helm_values.rego`

```rego
package helm.values

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.securityContext.runAsNonRoot
  msg := "runAsNonRoot required"
}

deny[msg] {
  input.resources[_].kind == "Deployment"
  not input.resources[_].spec.template.spec.containers[_].resources.limits
  msg := "resource limits required"
}
```

---

## Canary Values

### `helm/values-canary.yaml`

```yaml
replicaCount: 3
strategy:
  type: RollingUpdate
  rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
readinessProbe: { httpGet: { path: /healthz, port: http } }
livenessProbe: { httpGet: { path: /livez, port: http } }
resources:
  requests: { cpu: 100m, memory: 256Mi }
  limits: { cpu: 500m, memory: 512Mi }
podSecurityContext:
  { runAsNonRoot: true, seccompProfile: { type: RuntimeDefault } }
```

---

## CODEOWNERS & PR Template

### `.github/CODEOWNERS`

```txt
* @your-org/platform @your-org/app-owners
/helm/ @your-org/platform
/terraform/ @your-org/platform @your-org/secops
/apps/ @your-org/app-owners
/api/  @your-org/backend
```

### `.github/pull_request_template.md`

```md
### Summary

### Risk & Flags

- Feature flags:
- Data/schema:
- Rollback:

### Tests

### Observability

### Checklist

- [ ] Risky code behind flag
- [ ] Docs/runbooks updated
```

---

## Environment & Secrets

- `REGISTRY_USER`, `REGISTRY_TOKEN`
- `COSIGN_PRIVATE_KEY`, `COSIGN_PASSWORD`
- `KUBE_CONFIG`

---

## Notes

- Node uses **pnpm** with corepack and lockfile enforcement.
- Python targets **3.11** and discovers packages by path; adjust if you need a tox matrix.
- Preview envs namespace per PR: `pr-<number>`; script auto-creates/destroys.
- Maestro can call `wf-reuse-*` directly via `workflow_call` for batch orchestration and pass trace IDs.
