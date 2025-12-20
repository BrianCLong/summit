# Summit Kubernetes Deployment Guide

## Overview
This guide describes the production-ready Helm umbrella chart in `helm/summit` and the per-service charts for `server`, `client`, `ai-service`, and `worker-python`. It also covers namespace safeguards, service mesh, ExternalSecrets, network policies, HPAs, health probes, and the blue/green promotion workflow.

## Prerequisites
- Kubernetes 1.27+
- cert-manager installed for TLS certificates
- external-secrets.io configured with a `ClusterSecretStore` named `summit-secrets`
- Istio installed with an ingress gateway reachable for your hostnames
- Helm 3.14+

## Installing the umbrella chart
```bash
# From repo root
helm dependency update helm/summit
helm upgrade --install summit helm/summit \
  --namespace summit \
  --create-namespace \
  -f helm/summit/values.yaml
```

Override images, tags, and environment variables per service with `--set` or a custom values file. The umbrella chart feeds values into the subcharts (`server`, `client`, `ai-service`, `worker-python`, `istio-config`).

### Common overrides
- **Images:** `server.image.tag`, `client.image.tag`, `ai-service.image.tag`, `worker-python.image.tag`
- **Replicas and HPAs:** `*.replicaCount`, `*.hpa.*` for CPU/memory thresholds and custom metrics
- **Ingress:** `*.ingress.hosts[0].host`, `*.ingress.tls.secretName`, `common.ingress.className`
- **Mesh:** `mesh.*` and `istio-config.*` to switch injection or mTLS mode
- **Secrets:** `externalSecrets.storeRef.*` and `externalSecrets.manifests[*]` to map secret keys

## Namespace protections
`helm/summit/templates/namespace-resources.yaml` installs a `LimitRange` and `ResourceQuota` using `namespaceResources.*` to enforce default requests/limits and cap overall compute and PVC consumption. Adjust values to match cluster guardrails.

## Health probes
Each service exposes liveness, readiness, and optional startup probes. Paths and timing are configurable under `*.probes.*` in values. Default probe paths are `/healthz` for APIs and `/` for the web client.

## Horizontal Pod Autoscaling
HPAs are enabled by default for the four services and watch CPU + memory utilization. Custom pod metrics can be appended under `server.hpa.customMetrics` (e.g., `cypher_query_rate`) or similar lists if you add bespoke metrics to other charts. Set `minReplicas`/`maxReplicas` and utilization thresholds per service to match SLOs.

## Ingress and TLS
Ingress objects are created per service with `cert-manager.io/cluster-issuer` annotations. Provide the hosts and TLS secret names under `*.ingress.*`. The sample values assume Istio ingress, but you can switch to NGINX or other controllers via `className`.

## Service mesh
The `istio-config` dependency labels the namespace for sidecar injection, applies mesh-wide `PeerAuthentication` for STRICT mTLS, and provisions per-service `DestinationRule` entries. Override `istio-config.destinationRules` to tune subsets or TLS modes. Pods also set `sidecar.istio.io/inject` to true by default.

## External secrets
`helm/summit/templates/externalsecrets.yaml` wires critical secrets (Neo4j, Postgres, JWT, AI API keys) from the configured `ClusterSecretStore`. Update `externalSecrets.manifests` if your secret keys differ or additional services need credentials.

## Network policies
A namespace-wide default deny policy is installed with optional allowances for ingress/egress namespaces via `networkPolicies.ingressNamespaces` and `networkPolicies.egressNamespaces`. Service-specific policies can be tightened further through the child charts (e.g., `server.networkPolicy.*`).

## Blue/Green strategy
Deploy color-coded services using the `blueGreen.*` values on each chart. Services select pods by `release-color`. To promote a new color:
1. Deploy the new color by setting `*.blueGreen.selectorColor` to `green` in an override file and upgrading the release.
2. Validate traffic on the preview Service `<service>-green`.
3. Promote by running the Helm upgrade again with `blueGreen.selectorColor` pointing to the desired color. The hook job (`bluegreen-promotion-job.yaml`) patches the stable Service selector automatically when enabled.

## Troubleshooting
- **Pods Pending**: Check `kubectl describe quota` for LimitRange/ResourceQuota violations; adjust `namespaceResources` or per-pod resources.
- **TLS errors**: Ensure cert-manager ClusterIssuer exists and DNS resolves to the ingress gateway.
- **Sidecar missing**: Verify namespace label `istio-injection=enabled` and `istio-config` chart installation.
- **Secrets missing**: Confirm ExternalSecrets status and that `summit-secrets` store contains the expected keys.
