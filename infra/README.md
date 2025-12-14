# Summit Platform Infrastructure

This directory contains the Infrastructure-as-Code (IaC) and Environment definitions for the Summit Platform.

## Structure

*   `terraform/`: Terraform configurations for provisioning cloud resources.
    *   `modules/`: Reusable Terraform modules (EKS, RDS, S3, etc.).
    *   `envs/`: Environment-specific configurations (Staging, Prod).
        *   `staging/`: Staging environment (pre-prod).
        *   `prod/`: Production environment.
        *   `federal/`: Federal WORM compliance environment.
        *   `billing/`: Billing data stack.
        *   `aurora/`: Aurora DB stack.

## Environments

| Environment | Description | Managed By |
| :--- | :--- | :--- |
| **Local** | Developer laptop, Docker Compose. | `make dev` |
| **Staging** | Stable integration environment. | Terraform + Helm (CI/CD) |
| **Prod** | Production environment. | Terraform + Helm (CI/CD) |

## Usage

### Local Development

Use the root `Makefile` to start the local environment:

```bash
make dev
```

### Provisioning Infrastructure

Navigate to the environment directory and apply Terraform:

```bash
cd infra/terraform/envs/staging
terraform init
terraform plan
terraform apply
```
