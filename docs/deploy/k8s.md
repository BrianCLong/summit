# Summit Kubernetes Deployment Guide

This guide describes how to install the Summit Helm umbrella chart, override values for each workload, run blue-green promotions, and troubleshoot common issues.

## Prerequisites

- Kubernetes cluster 1.26+
- Helm 3.12+
- cert-manager with a `ClusterIssuer` available for TLS termination
- Istio (or compatible mesh) installed with sidecar injection enabled for the namespace
- External Secrets Operator installed with a configured `ClusterSecretStore`

## Chart Layout

```
helm/
  umbrella/                # Umbrella application chart
  charts/summit-service/   # Library chart used by each workload
```

The umbrella chart loops over `values.yaml` and renders Deployments, Services, HPAs, Ingress, mesh policies, ExternalSecrets, and NetworkPolicies per workload.

## Installing

1. Create or select the target namespace and enable Istio sidecar injection:
   ```bash
   kubectl create namespace summit --dry-run=client -o yaml | kubectl apply -f -
   kubectl label namespace summit istio-injection=enabled --overwrite
   ```
2. Install cert-manager ClusterIssuer (skip if already available):
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/cert-manager/cert-manager/master/deploy/manifests/00-crds.yaml
   helm repo add jetstack https://charts.jetstack.io
   helm upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
   ```
3. Install the umbrella chart:
   ```bash
   helm dependency update helm/umbrella
   helm upgrade --install summit helm/umbrella -n summit
   ```

## Overriding Values

Create an override file (for example `values.prod.yaml`) that sets images, secrets, scaling, and ingress per service:

```yaml
global:
  imageTag: v1.2.3
  ingress:
    clusterIssuer: letsencrypt-prod
  secretStoreRef:
    name: summit-prod
    kind: ClusterSecretStore
services:
  api:
    image:
      tag: v1.2.3
    ingress:
      hosts:
        - host: api.example.com
      tlsSecret: api-example-tls
    externalSecrets:
      keys:
        - name: database-url
          remoteKey: prod/api
          property: DATABASE_URL
  client:
    ingress:
      hosts:
        - host: app.example.com
```

Apply with:

```bash
helm upgrade --install summit helm/umbrella -n summit -f values.prod.yaml
```

## Blue-Green Deployments

Each workload renders blue and green Deployments plus color-specific services. The primary service points to `blueGreen.activeColor`, and a Helm hook job promotes the `targetColor` after upgrades.

1. Update the target color in your overrides:
   ```yaml
   services:
     api:
       blueGreen:
         targetColor: green
   ```
2. Deploy the new release. Helm creates `api-blue` and `api-green` services and Deployments.
3. Validate the inactive color service directly (for example, `kubectl port-forward svc/summit-api-green 8080:8080`).
4. The promotion job (post-install/upgrade hook) patches the stable service selector to the `targetColor`. Update `activeColor` in values on the next release to make the new color the default.

## Troubleshooting

- **Pods not ready**: check readiness/startup probes and pod logs: `kubectl logs deploy/summit-api-blue`.
- **Ingress TLS fails**: verify the ClusterIssuer name and that the secret exists: `kubectl describe certificate summit-api-tls`.
- **ExternalSecret pending**: confirm the `ClusterSecretStore` reference in `global.secretStoreRef` and that remote keys exist.
- **HPA not scaling**: ensure metrics-server is installed and custom metrics are registered if configured.
- **Mesh traffic issues**: check DestinationRule and PeerAuthentication resources to confirm subsets and mTLS mode.

## Cleanup

Remove the release and namespace:

```bash
helm uninstall summit -n summit
kubectl delete namespace summit
```
