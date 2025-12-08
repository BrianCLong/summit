# Summit Terraform Architecture

This document defines the standard structure for Summit's Infrastructure as Code (IaC) using Terraform.

## Directory Structure

We follow a **Modular + Environment Stack** approach.

```
terraform/
├── modules/                 # Reusable infrastructure components
│   ├── vpc/                 # Network
│   ├── k8s-cluster/         # EKS/GKE/AKS
│   ├── rds/                 # Managed Database
│   ├── redis/               # Managed Cache
│   ├── s3/                  # Object Storage
│   └── iam/                 # Identity & Access
│
├── environments/            # Live environments (roots)
│   ├── dev/
│   │   ├── main.tf          # Instantiates modules
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf       # Remote state config
│   ├── staging/
│   │   └── ...
│   └── prod/
│       └── ...
│
└── bootstrap/               # Initial setup (Terraform state bucket, locks)
```

## State Management

*   **Backend**: S3 (AWS) or GCS (Google Cloud) or Azure Blob Storage.
*   **Locking**: DynamoDB (AWS) or native locking.
*   **Isolation**: Each environment (`dev`, `staging`, `prod`) has its own state file.
    *   `summit-terraform-state/dev/terraform.tfstate`
    *   `summit-terraform-state/prod/terraform.tfstate`

## Modules

Modules should be:
1.  **Opinionated**: Set sensible defaults (encryption enabled, private subnets).
2.  **Versioned**: Pinned in environment stacks (e.g., `source = "../../modules/vpc"` or git tag).
3.  **Documented**: `README.md` with inputs/outputs.

## Workflow

1.  **Plan**: Runs on Pull Request against the target environment.
2.  **Apply**:
    *   `dev`: Auto-apply on merge to `main`.
    *   `staging`: Auto-apply on merge to `main` (or separate release branch).
    *   `prod`: Manual approval required via GitHub Environments.

## Naming Conventions

*   Resources: `summit-<env>-<resource>` (e.g., `summit-prod-db`).
*   Tags: All resources must have:
    *   `Environment = <env>`
    *   `Project = summit`
    *   `ManagedBy = terraform`
