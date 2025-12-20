# Helm Governance and Promotion Pipeline

This repository now includes a dedicated CI pipeline that validates Helm assets end to end, enforces policy, exercises Kind-based deployments, and publishes operational artifacts for downstream review.

## Pipeline stages

1. **Lint and template validation**
   - `ct lint` runs against both `charts/` and `helm/` with kubeconform schema checks.
   - `scripts/helm/render-manifests.sh` renders each chart twice (defaults and CI overrides) with deterministic image/tag injection.
   - Rendered bundles are validated with kubeconform and uploaded as artifacts for reuse.

2. **Policy scanning**
   - OPA/conftest executes Rego policies in `helm/policies/opa` to guard labels, resource limits, and security contexts.
   - Kyverno CLI applies `helm/policies/kyverno` against the rendered manifests to enforce non-root execution, resource guarantees, and managed-by labeling.

3. **Kind integration tests**
   - A Kind cluster installs the `helm/ai-service` chart twice: once with injected defaults and once with CI overrides (`helm/ai-service/values.ci.yaml`).
   - Smoke tests from `charts/scripts/smoke-tests.sh` verify pod readiness, deployments, and basic cluster hygiene in the `helm-ci` namespace.

4. **Artifacts**
   - `helm-docs` generates chart documentation bundles uploaded as the `helm-governance-docs` artifact.
   - Grafana and monitoring dashboards from `charts/*/dashboards` are archived and published as `helm-dashboard-bundles`.

## Image/tag injection and blue-green readiness

Image repository and tag overrides are provided via workflow inputs (`image_repository`, `image_tag`) and propagated through `scripts/helm/render-manifests.sh` and the Kind installs. The structure aligns with the existing blue/green rollout tooling so promotion jobs can consume the same image inputs without additional chart edits.

## Local validation

```bash
# Lint and render with kubeconform
helm lint helm/ai-service
ct lint --config charts/ct.yaml --all
scripts/helm/render-manifests.sh /tmp/manifests
kubeconform -summary -strict /tmp/manifests/*.yaml

# Dry-run Kind flow
kind create cluster --name helm-ci
helm upgrade --install ai-service-default helm/ai-service --namespace helm-ci --create-namespace \
  --set image.repository=ghcr.io/stefanprodan/podinfo --set image.tag=6.6.1 \
  --set hpa.enabled=false --set serviceMonitor.enabled=false --set istio.enabled=false
NAMESPACE=helm-ci charts/scripts/smoke-tests.sh
```
