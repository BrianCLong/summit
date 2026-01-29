# Summit Platform

The unified intelligence analysis platform with AI-augmented graph analytics.

## 🚀 Deployment Status

| Environment    | Status           | CI/CD                                              | Infra                                              |
| :------------- | :--------------- | :------------------------------------------------- | :------------------------------------------------- |
| **Production** | 🟢 **GA v1.0.0** | [GitHub Actions](.github/workflows/deploy-aws.yml) | [AWS EKS (Terraform)](terraform/environments/prod) |
| **Staging**    | 🟢 Verified      | Manual Promotion                                   | AWS EKS                                            |
| **Dev**        | 🔵 Hardened      | Auto-Deploy on Merge                               | AWS EKS                                            |
| **Preview**    | 🧪 Ephemeral     | [PR Previews](.github/workflows/pr-preview.yml)    | AWS EKS (Spot)                                     |

## ✨ Core Features (v1.0.0)

- **Psychographically Aware Engine**: Advanced agent-based modeling factoring in emotional climate and moral foundations.
- **Privacy-Preserving Telemetry**: Centralized PII masking and deterministic ID anonymization for secure analysis.
- **Resilient Intelligence Pipeline**: Integrated circuit breakers, multi-layer caching, and default-deny access control.
- **AI-Augmented Graph Analytics**: GNN-driven prioritization and influence operation detection.

## 🛡️ Governance Status

![Fresh Evidence Rate (7d)](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/BrianCLong/summit/main/docs/governance/metrics/fresh-evidence-rate.json)

## 📚 Documentation

- **[Infrastructure & Operations](infra/README.md):** The central hub for all DevOps tasks.
- **[AWS Deployment Guide](docs/AWS_DEPLOYMENT.md):** Step-by-step instructions to go from zero to live.
- **[Runbooks](docs/runbooks/):** Emergency procedures (Database Recovery, Rollbacks).
- **[Governance](docs/GOVERNANCE.md):** Branch protection and security rules.
- **[PR Previews](docs/devops/preview-environments.md):** How our ephemeral preview environments work.

## 🛠️ Quick Start (Local)

```bash
# Start the full stack locally
docker-compose up

# Access Services:
# - Frontend: http://localhost:3000
# - Neo4j: http://localhost:7474
# - Postgres: localhost:5432
```

## 🔐 Architecture

The platform runs on a modern "Cattle" architecture on AWS:

- **Compute:** EKS (Spot Instances)
- **Data:** Aurora Serverless v2 (Postgres), ElastiCache (Redis), Neo4j (Self-Hosted on K8s)
- **Security:** OIDC, Private Subnets, Trivy Scanning

For more details, see [infra/README.md](infra/README.md).
