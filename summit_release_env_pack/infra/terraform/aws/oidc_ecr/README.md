# AWS OIDC + ECR (Terraform)

**Generated:** 2025-09-11 07:34:35Z UTC

## Usage

```bash
cd infra/terraform/aws/oidc_ecr
terraform init
terraform apply -var='region=us-east-1' -var='repo_name=summit' -var='github_org=YOUR_ORG' -var='github_repo=YOUR_REPO'
```

Outputs:

- `ecr_repository_url`
- `gha_oidc_role_arn` → put into GitHub Actions secrets as `AWS_ROLE_ARN`.
