# On-Premises Deployment

Summit Enterprise can be deployed on-premises for maximum sovereignty and security.

## Requirements

- **Kubernetes**: v1.25+ (RKE2, K3s, or standard K8s).
- **Storage**: Persistent Volumes for Neo4j, Postgres, and Redis.
- **Network**: Ingress controller (Nginx/Traefik).

## Configuration

Use the Helm charts in `deploy/helm` with the `onprem-values.yaml` profile.

```bash
helm install summit deploy/helm/summit -f deploy/helm/onprem-values.yaml
```

## Security

- All containers are built from verified, scanned images.
- No outbound internet access is required (air-gapped compatible).
- Secrets should be managed via HashiCorp Vault or Kubernetes Secrets.
