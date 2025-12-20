# Helm governance CI bundle

This pipeline hardens Helm delivery by combining linting, templating, policy gates, and integration smoke tests. It is triggered for Helm and policy changes across `helm/`, `charts/`, `infra/helm/`, service Helm folders, and supporting policy directories.

## What runs

1. **Chart discovery + linting**
   - Uses [`ct lint`](https://github.com/helm/chart-testing) with `.github/ct-helm.yaml` to enforce chart hygiene for all discovered charts.
   - Caches Helm downloads via `azure/setup-helm` and reuses repo metadata.

2. **Template and schema validation**
   - Renders every chart with `helm template` using `helm/ci-values.yaml` and environment overrides (`values.dev.yaml`, `values.stage.yaml`, `values.prod.yaml` when present).
   - Applies `kubeconform` with strict mode and missing-schema ignore to validate generated manifests.
   - Exports a manifest bundle and kubeconform summary as CI artifacts.

3. **Policy gates**
   - Runs OPA/Conftest policies from `policy/conftest/helm-ci` against the rendered manifests.
   - Executes Kyverno validation (`policy/kyverno` and `policies/kyverno`) and publishes a policy report artifact.

4. **Integration (Kind) smoke**
   - Provisions a Kind cluster, deploys the `helm/summit` chart twice to simulate **blue/green promotion**, and annotates the service with promotion metadata.
   - Injects the commit SHA as the image tag, applies overrides from `helm/summit/values.dev.yaml`, and verifies rollout health plus a lightweight pod-based smoke probe.

5. **Documentation + dashboards**
   - Archives Helm README files and Grafana dashboard bundles under `monitoring/dashboards` and `monitoring/grafana` for reviewers.

## How to use locally

```bash
# Lint and template all charts with ci-values
ct lint --config .github/ct-helm.yaml --all
./scripts/render_helm.sh   # optional helper if you maintain one

# Validate rendered output
find helm-rendered -name '*.yaml' -print0 | xargs -0 kubeconform -strict -ignore-missing-schemas -summary
conftest test helm-rendered/**/*.yaml -p policy/conftest/helm-ci
kyverno apply policy/kyverno/helm-ci.yaml --resource helm-rendered/**/*.yaml --policy-report

# Smoke-test with Kind
kind create cluster
helm upgrade --install summit helm/summit \
  --namespace summit --create-namespace \
  --values helm/ci-values.yaml \
  --set image.repository=registry.k8s.io/pause \
  --set image.tag=$(git rev-parse --short HEAD) --wait
```

## Outputs to expect

- `helm-rendered-manifests` artifact containing rendered manifests and kubeconform summaries.
- `helm-docs-and-dashboards` artifact bundling READMEs and Grafana dashboards.
- `helm-policy-report` artifact with Kyverno policy evaluation results.
- Kind smoke test logs showing blue/green rollout annotations and smoke pod completion.
