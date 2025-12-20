# Summit Kubernetes Deployment Guide

This guide documents the Summit umbrella Helm chart and the per-service deployment controls added for mesh, security, and blue/green delivery.

## Chart layout

- `helm/umbrella`: umbrella chart that renders Deployments, Services, HPAs, mesh resources, ExternalSecrets, NetworkPolicies, and ingress per workload defined in `values.yaml`.
- `helm/umbrella/templates/namespace-resources.yaml`: namespace-level `ResourceQuota` and `LimitRange` defaults.
- `helm/umbrella/templates/workloads.yaml`: per-service Deployments, Services, Ingress, HPA, Istio `PeerAuthentication`/`DestinationRule`, ExternalSecrets, and NetworkPolicies with health probes and resource defaults.
- `helm/umbrella/templates/bluegreen-promotion.yaml`: Helm hook job that flips stable service selectors between the active and standby colors.

## Installation

1. Ensure cert-manager, External Secrets Operator, and Istio CRDs are installed in the target cluster.
2. Create (or reference) the target namespace. Set `.Values.namespace` and optionally `createNamespace` if you manage namespaces separately.
3. Provide a `values.yaml` overlay (see examples below) and install:

```bash
helm upgrade --install summit helm/umbrella -f my-values.yaml
```

## Values overview

### Workload inventory

`values.yaml` ships with entries for the main Summit services: `server`, `client`, `ai-service`, `nlp-service`, `osint-service`, `worker-python`, `redis`, `postgres`, and `neo4j`. Each workload accepts:

- `image.repository`/`image.tag`
- `service.port` and `service.targetPort`
- `ingress.host`, `ingress.path`, and optional `ingress.annotations`
- `env` key/value list and optional `envFromSecret` reference
- `externalSecrets[]` to map remote secrets into Kubernetes `Secret`s
- `resources`, `nodeSelector`, `tolerations`, `affinity`
- `mesh.enabled`, `networkPolicy.ingress`/`egress`, and `hpa` overrides

### Defaults

- Resource defaults: requests `200m/256Mi`, limits `1 CPU/1Gi` applied if not overridden per workload.
- Probes: liveness/readiness on `/healthz` and startup probe on `/startup` (configurable per service).
- Ingress: TLS via cert-manager `ClusterIssuer` (`letsencrypt-production`) and Istio ingress class.
- HPA: CPU and memory utilization targets (70% CPU / 75% memory) with min/max replicas 2/10.
- Mesh: Istio sidecar injection annotations, `PeerAuthentication` (STRICT mTLS), and `DestinationRule` using ISTIO_MUTUAL TLS.
- Security: default NetworkPolicy allowing only configured namespaces plus Istio ingress; ExternalSecret uses a `ClusterSecretStore` named `summit-vault`.
- Namespace guardrails: `ResourceQuota` and `LimitRange` applied by default.

## Blue/Green deployments

- Colors: `.Values.blueGreen.activeColor` (default `blue`) and `.Values.blueGreen.standbyColor` (default `green`).
- Deployments & services: when blue/green is enabled, each workload renders a pair of Deployments/Services labeled with the color. The stable traffic service for a given color is `<workload>-<color>`.
- Promotion: the `bluegreen-promotion` Helm hook job uses `kubectl` to retarget services to the active and standby colors. Update the standby release (e.g., new image tag), validate via the color-specific service, then trigger a Helm upgrade to run the hook and promote.

## External secrets

Add external secret mappings under `workloads.<name>.externalSecrets`:

```yaml
workloads:
  server:
    externalSecrets:
      - name: server-secrets
        secretStoreRef:
          kind: ClusterSecretStore
          name: summit-vault
        data:
          - secretKey: DATABASE_URL
            remoteRef:
              key: summit/database
              property: url
```

## Network policies

Each workload renders a restrictive `NetworkPolicy` by default. Adjust `defaults.networkPolicy.allowNamespaces` to add ingress sources, and `workloads.<name>.networkPolicy.egress` to whitelist egress destinations (DNS is included). To permit Istio ingress, leave `allowIstioIngress: true`.

## Observability hooks

HPAs ship with CPU and memory metrics by default; add custom metrics under `workloads.<name>.hpa.metrics` following the autoscaling/v2 schema. Service mesh annotations ensure Envoy sidecars start before the app container.

## Example override

```yaml
namespace: summit-prod
blueGreen:
  activeColor: green
  standbyColor: blue
workloads:
  server:
    image:
      tag: "v2.1.0"
    hpa:
      minReplicas: 3
      maxReplicas: 12
    ingress:
      host: api.prod.example.com
    networkPolicy:
      ingress:
        - namespaceSelector:
            matchLabels:
              istio-injection: enabled
```

## Troubleshooting

- **Pods stuck Pending**: verify namespace `ResourceQuota` and `LimitRange` align with node capacity; adjust in `values.yaml`.
- **Ingress TLS issues**: confirm cert-manager `ClusterIssuer` exists and the rendered TLS secret names align with your DNS.
- **External secrets missing**: check External Secrets Operator logs and validate the `secretStoreRef` configuration.
- **Mesh connectivity**: ensure Istio sidecar injection is enabled for the namespace or via per-pod annotations.
- **Blue/green confusion**: inspect service selectors (`kubectl -n <ns> get svc <workload>-blue -oyaml`) to verify which color receives traffic.
