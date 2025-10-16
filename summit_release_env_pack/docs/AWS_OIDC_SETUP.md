# AWS OIDC Setup

- Apply Terraform in `infra/terraform/aws/oidc_ecr`.
- Ensure a **GitHub OIDC provider** exists in AWS (module expects it).
- Save outputs; add `AWS_ROLE_ARN` + `AWS_REGION` to repo secrets.
- Restrict role via `ref_patterns` if desired (e.g., only main/tags).
