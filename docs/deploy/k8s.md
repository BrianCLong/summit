# Summit Kubernetes Deployment Guide

This guide describes the production-ready Summit deployment bundle under `infra/helm/summit-platform`. The umbrella chart wires mesh defaults, ingress/TLS, autoscaling, quotas, external secrets, and network policies around the core platform services (intelgraph, gateway, web, analytics, redis, postgres, neo4j).

## Chart layout

- `infra/helm/summit-platform/Chart.yaml`: umbrella chart pulling local service charts as dependencies.
- `infra/helm/summit-platform/values.yaml`: opinionated defaults for mesh, ingress, blue/green routing, HPAs, quotas, and ExternalSecrets.
- `infra/helm/summit-platform/templates/mesh.yaml`: namespace labeling for sidecar injection plus `PeerAuthentication` for STRICT mTLS.
- `infra/helm/summit-platform/templates/ingress.yaml`: Istio/ingress class with cert-manager annotations and TLS termination.
- `infra/helm/summit-platform/templates/resourcequota.yaml` and `limitrange.yaml`: namespace guardrails.
- `infra/helm/summit-platform/templates/hpa.yaml`: autoscalers for each workload defined in `.Values.global.hpa.workloads`.
- `infra/helm/summit-platform/templates/networkpolicies.yaml`: default ingress/egress allowlists.
- `infra/helm/summit-platform/templates/externalsecret.yaml`: secrets materialized from External Secrets Operator.
- `infra/helm/summit-platform/templates/bluegreen-service.yaml`: active/preview services keyed on color labels for blue/green promotion.

## Installation

1. Preinstall cluster prerequisites: Istio (or your mesh of choice), cert-manager, External Secrets Operator, and the Prometheus Operator CRDs.
2. Create a namespace (or allow Helm to create it) and label it for sidecar injection if using Istio.
3. Prepare an overlay values file (see examples) and install:

```bash
helm dep up infra/helm/summit-platform
helm upgrade --install summit infra/helm/summit-platform -n summit --create-namespace -f my-values.yaml
```

## Values overview

`values.yaml` ships with secure defaults:

- **Mesh**: sidecar injection enabled and `PeerAuthentication` STRICT mTLS.
- **Ingress**: Istio ingress class, TLS secret `summit-tls`, and cert-manager ClusterIssuer `letsencrypt-prod`.
- **Quotas/Limits**: `ResourceQuota` for CPU/memory, pod/PVC caps; `LimitRange` defaults/requests/min/max for containers.
- **HPAs**: autoscaling definitions for `intelgraph-api`, `gateway`, and `web` with CPU/memory utilization targets.
- **NetworkPolicies**: ingress allowlists for mesh traffic and observability, plus an egress policy restricting traffic to mTLS namespaces and Postgres.
- **ExternalSecrets**: sample mappings for database and OIDC credentials using `ClusterSecretStore summit-vault`.
- **Blue/Green**: active (`blue`) and preview (`green`) services for `web`, `gateway`, and `intelgraph-api` keyed by `rollout.summit.dev/color`.

You can add or override workloads under `global.hpa.workloads` and `global.blueGreen.services` to align with additional services.

## Blue/green deployment flow

1. Deploy the inactive color by setting pod template labels (e.g., `rollout.summit.dev/color=green`) on the target workload.
2. Validate via the `-preview` service rendered by `bluegreen-service.yaml`.
3. Promote by flipping `global.blueGreen.activeColor` to the validated color and running `helm upgrade`; the chart rewires the stable service selectors accordingly.

## Health, scaling, and security controls

- **Probes**: configure liveness/readiness/startup probes within the underlying service charts; the umbrella chart does not override them.
- **Autoscaling**: extend or override metrics per workload via `.Values.global.hpa.workloads[].metrics` using the autoscaling/v2 API schema.
- **Quotas/limits**: tune `global.resourceQuota.hard` and `global.limitRange.*` to match your cluster sizing.
- **Network policies**: add additional ingress/egress items to the respective lists to grant least-privilege traffic between tiers.
- **TLS**: replace `global.ingress.tls.secretName` and `issuerRef` to use your PKI; mesh mTLS is enforced through `PeerAuthentication`.

## Secrets management

Enable External Secrets Operator and populate your secret backend with the referenced keys (e.g., `summit/database`, `summit/oidc`). The chart materializes Kubernetes `Secret`s named after the `global.externalSecrets.secrets[].name` entries and can be mounted by downstream workloads.

## Observability hooks

- HPAs use resource metrics by default; mesh ensures request/trace correlation through Envoy sidecars.
- ServiceMonitors and alerting rules live under `infra/observability/`; apply them after the chart install to capture agent metrics, mesh health, and profiling pipelines.

## Troubleshooting

- **Pods Pending**: increase quota/limit ranges or adjust requested resources to fit node capacity.
- **Cert issues**: check `cert-manager` events and verify DNS matches `global.ingress.hosts`.
- **Secrets missing**: confirm External Secrets Operator has permissions to reach the configured `ClusterSecretStore` and that remote keys exist.
- **Mesh traffic blocked**: ensure namespace labels and NetworkPolicies allow ingress from the mesh namespace; verify mTLS modes across workloads.
- **Blue/green traffic**: inspect rendered services (`kubectl -n summit get svc -l rollout.summit.dev/role`) to confirm which color is active.
