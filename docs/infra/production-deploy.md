# Production Deployment

- Provision cloud infra with Terraform (`terraform/envs/prod`).
- Install NGINX Ingress and cert-manager.
- Install monitoring stack (`helm/monitoring`).
- Deploy services via CI/CD or local Helm:
  - `helm upgrade --install server ./helm/server -n prod`
  - `helm upgrade --install client ./helm/client -n prod`
- Configure DNS to point to the ingress controller.

Branching:
- `main` → staging deploy
- `v*.*.*` tags → production deploy

Rollback:
- `helm rollback <release> <revision>`

