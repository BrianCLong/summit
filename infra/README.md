# Summit Platform Infrastructure

Welcome to the infrastructure repository for the Summit Platform. This directory contains all the code, scripts, and documentation required to deploy and operate the platform on AWS.

## 🗺️ Map

| Component | Path | Description |
| :--- | :--- | :--- |
| **Infrastructure as Code** | [`terraform/environments/prod`](../terraform/environments/prod) | Production AWS resources (EKS, RDS, VPC) |
| **Kubernetes Charts** | [`charts/universal-app`](../charts/universal-app) | Standard Helm chart for microservices |
| **Operational Scripts** | [`scripts/`](../scripts) | CLI tools for secrets, bootstrap, and verification |
| **Documentation** | [`docs/`](../docs) | Runbooks and Deployment Guides |

## 🚀 Quick Start (Day 0)

1.  **Provision AWS:**
    ```bash
    task infra:init
    task infra:apply
    ```

2.  **Bootstrap Cluster (Day 1):**
    ```bash
    ./scripts/cluster-bootstrap.sh
    ```

3.  **Inject Secrets:**
    ```bash
    task secrets:init
    ```

## 🛠️ Operations (Day 2+)

*   **Deploy:** `task deploy:aws` (Manual) or `git push` (CI/CD)
*   **Verify Health:** `./scripts/verify-deployment.sh`
*   **Emergency Rollback:** `./scripts/emergency-rollback.sh <app-name>`

## 🆘 Runbooks

*   [Deployment Guide](../docs/AWS_DEPLOYMENT.md)
*   [Database Recovery](../docs/runbooks/DB_RECOVERY.md)
*   [Governance & Branch Protection](../docs/GOVERNANCE.md)

## 🏗️ Architecture

*   **Compute:** AWS EKS (Spot Instances)
*   **Database:** Aurora Serverless v2 (PostgreSQL)
*   **Graph:** Neo4j (Self-Hosted on EKS Memory Nodes)
*   **Cache:** ElastiCache (Redis)
*   **Security:** Trivy Scanning, OIDC, Private Subnets