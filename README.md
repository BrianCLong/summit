# Summit Platform

The unified intelligence analysis platform with AI-augmented graph analytics.

## Deployment Status

| Environment | Status | CI/CD | Infra |
| :--- | :--- | :--- | :--- |
| **Production** | Ready | [GitHub Actions](.github/workflows/deploy-aws.yml) | [AWS EKS (Terraform)](terraform/environments/prod) |
| **Staging** | Provisioned | Manual Promotion | AWS EKS |
| **Dev** | Active | Auto-Deploy on Merge | AWS EKS |

## Documentation

*   **[Infrastructure & Operations](infra/README.md):** The central hub for all DevOps tasks.
*   **[AWS Deployment Guide](docs/AWS_DEPLOYMENT.md):** Step-by-step instructions to go from zero to live.
*   **[Runbooks](docs/runbooks/):** Emergency procedures (Database Recovery, Rollbacks).
*   **[Governance](docs/GOVERNANCE.md):** Branch protection and security rules.

## Quick Start (Local)

```bash
# Start the full stack locally
docker-compose up

# Access Services:
# - Frontend: http://localhost:3000
# - Neo4j: http://localhost:7474
# - Postgres: localhost:5432
```

## Architecture

The platform runs on a modern "Cattle" architecture on AWS:

*   **Compute:** EKS (Spot Instances)
*   **Data:** Aurora Serverless v2 (Postgres), ElastiCache (Redis), Neo4j (Self-Hosted on K8s)
*   **Security:** OIDC, Private Subnets, Trivy Scanning

For more details, see [infra/README.md](infra/README.md).
