# Helm + ArgoCD + Multi‑Account ECR Pack

**Generated:** 2025-09-11 07:38:46Z UTC

Contents:

- **Helm chart** with dev/staging/prod values
- **helmfile** for quick local install across envs
- **ArgoCD app‑of‑apps** (project + per‑env applications)
- **Terraform**: multi‑account ECR, OIDC roles, optional replication
- **GitHub Actions**: cross‑account promotion (manifest copy) and ArgoCD deploy
- **Docs** on patterns and setup

Next steps:

1. Replace `REPLACE_REGISTRY` in `helm/summit/values*.yaml` with your registry url(s).
2. Update ArgoCD repoURL placeholders to your Git repo.
3. Apply Terraform and add outputs to repo secrets as documented.
4. Apply ArgoCD project + root app; Argo will manage env apps automatically.
