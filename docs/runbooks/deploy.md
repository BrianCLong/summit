# Runbook: Production Deployment

## Docker Compose (Simple)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Deploy services
docker compose up -d
```

## Kubernetes (Helm)

```bash
# Install with Helm
helm upgrade --install intelgraph deploy/helm/intelgraph \
  -n intelgraph --create-namespace \
  --set-file config.jwtPublicKey=jwt-public.pem \
  --set config.neo4jPassword="$(kubectl get secret neo4j-auth -o jsonpath='{.data.password}' | base64 -d)"
```

## AWS EKS + Terraform

```bash
cd deploy/terraform/environments/production
terraform init
terraform plan
terraform apply

# Deploy application
kubectl apply -k deploy/kubernetes/overlays/production
```

## Post-deployment

- Verify health endpoints: `/api/health`, `/ml/health`
- Run database migrations
- Configure monitoring and alerting
- Set up backups
