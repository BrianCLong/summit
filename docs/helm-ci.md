# Helm lint and validation

## Where charts live
Charts with a `Chart.yaml` live in multiple locations and are picked up automatically by the CI workflow:

- Core services in `helm/` (ai-service, ai-service-platform, client, intelgraph, neo4j, nlp-service, osint-service, postgres, predictive-suite, redis, server, summit, tenant, worker-python).
- Platform infrastructure in `infra/helm/` (analytics, gateway, intelgraph, neo4j, postgres, redis, web).
- Release bundles in `deploy/helm/intelgraph/` and multi-account packaging in `summit_helm_argocd_multiacct_pack/helm/summit/`.
- Packaged charts in `charts/` (backup, companyos, companyos-console, flow-audit, gateway, ig-platform, ig-runner variants, intelgraph-api, intelgraph-maestro, maestro, mc-runner, monitoring, observability, opencost, replicator, satellite, velero, worker-gpu).
- Environment overlays under `k8s/` (opa, prov-ledger, copilot, sandbox, otel-collector, grafana) plus `ops/gateway/`.
- Service bundles in `services/digital-twin/helm/` and `services/docling-svc/helm/docling-svc/`.
- Reference implementations in `deepagent-mvp/helm/`, `graph-xai/infra/helm/graph-xai/` (and the mirrored `graph_xai/infra/helm/graph-xai/`), and `templates/golden-path-platform/helm/` (hello-service, hello-job).
- Extensions in `summit-company_extended/infra/helm/charts/` (intelgraph-api, orgmesh-exporter) and `v24_modules/trust_score_calculator/`.
- GA GraphAI infra in `ga-graphai/infra/helm/` (graphai, gateway, minio, neo4j, postgres, redis, web, worker).
- Ledger variants in `prov-ledger/infra/helm/prov-ledger/`, `prov_ledger/infra/helm/prov-ledger/`, and `sprint-kits/proof-first-core-ga/charts/` (prov-ledger, er-service, cost-guard).

## CI workflow expectations
The workflow at `.github/workflows/helm-lint-validate.yml` runs on pull requests that touch Helm content and can be launched manually. It:

1. Installs Helm with caching for downloaded chart data.
2. Seeds common upstream repositories (bitnami, prometheus-community, grafana, jaegertracing, neo4j, jetstack, external-secrets, opentelemetry, gatekeeper, ingress-nginx) to satisfy dependencies.
3. Runs `helm lint` against every discovered chart using the shared sample values file.
4. Renders each chart with `helm template ... --include-crds` and pipes the output through `kubeconform` for schema validation with `-strict`.
5. Optionally provisions a Kind cluster (`run_kind_smoke` input) and installs the `helm/redis` chart as a smoke test.

## Sample values for CI
The workflow uses `helm/ci-values.yaml` to provide deterministic defaults when linting and templating:

```yaml
global:
  domain: example.local
  imagePullSecrets: []
image:
  repository: ghcr.io/example/placeholder
  tag: latest
  pullPolicy: IfNotPresent
persistence:
  enabled: false
```

You can reuse the same file locally:

```bash
helm lint helm/ai-service -f helm/ci-values.yaml
helm template ai-service helm/ai-service -f helm/ci-values.yaml --include-crds | kubeconform -strict -ignore-missing-schemas
```
