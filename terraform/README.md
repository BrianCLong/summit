Infrastructure as Code for IntelGraph using Terraform.

Environments:
- envs/staging
- envs/prod

Modules:
- eks: Managed Kubernetes cluster (EKS)
- rds-postgres: Managed Postgres (RDS)
- s3-backups: Object storage for backups
- neo4j-aura (optional): Reference to Neo4j Aura instance

Usage:
1) cd terraform/envs/staging
2) terraform init
3) terraform apply -var-file=staging.tfvars

Note: Modules use official upstream modules (terraform-aws-modules). Ensure cloud credentials are configured.

