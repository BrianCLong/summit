# Release & Environments Pack

**Generated:** 2025-09-11 07:34:35Z UTC

Contents:

- Terraform to provision **AWS ECR** and a **GitHub OIDC** role
- GitHub Actions to **build/push** to ECR
- **Kustomize** base + overlays for **dev/staging/prod**
- **Kyverno** security policies mirroring Gatekeeper baselines + **probes required**
- **Promote workflow** (dev→staging→prod) with GitHub **environment** gates
- Optional **Argo Rollouts** canary example

## Quick Start

1. Apply Terraform: set `github_org`, `github_repo`, `repo_name`, `region`. Capture outputs.
2. In GitHub repo **Secrets and variables → Actions**:
   - `AWS_ROLE_ARN` (from Terraform)
   - `AWS_REGION` (e.g., us-east-1)
   - `KUBECONFIG_DEV`, `KUBECONFIG_STAGING`, `KUBECONFIG_PROD` (base64 kubeconfigs)
3. Replace `REPLACE_ECR_URL` in `k8s/` with your ECR registry URL from Terraform output.
4. Push to `main` to publish images. Use **Promote** workflow to deploy to staging/prod with environment approvals.
5. Apply **Kyverno** or **Gatekeeper** policies to the cluster for enforcement.

**Note:** GitHub environment reviewers/protections must be enabled via repo settings (Settings → Environments).

See `docs/` for details.
