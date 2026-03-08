# AWS Path A Deployment Guide

## Overview

**Path A** represents the "Golden Path" for deploying the Summit platform to AWS. It prioritizes:

*   **Determinism**: Infrastructure as Code (IaC) using Terraform.
*   **Security**: Minimal privilege, private networking by default.
*   **Observability**: Integrated monitoring and logging from day one.
*   **Maintainability**: Modular design with clear separation of concerns.

This path targets a standard deployment architecture:
1.  **Network Layer**: VPC, Subnets (Public/Private/Database), NAT Gateways.
2.  **Compute Layer**: EKS (Kubernetes) for containerized workloads.
3.  **Data Layer**: RDS (PostgreSQL) and Neo4j (Self-hosted on EC2/EKS or Aura).
4.  **Observability Layer**: Prometheus, Grafana, OpenTelemetry.

## Prerequisites

To work with this infrastructure stack, you need:

1.  **AWS CLI**: Configured with appropriate credentials (`aws configure`).
2.  **Terraform**: Version `1.5.0` or later (managed via `versions.tf`).
3.  **kubectl**: For interacting with the EKS cluster (later stages).
4.  **jq**: For JSON processing in scripts.

## Directory Structure

The IaC codebase is located in `infra/aws/terraform/`.

```
infra/aws/terraform/
├── environments/       # Environment-specific variable files (.tfvars)
├── modules/            # Reusable Terraform modules
├── main.tf             # Root module entry point
├── variables.tf        # Input variables
├── outputs.tf          # Output values
├── providers.tf        # Provider configurations
└── versions.tf         # Version constraints
```

## Golden Path Commands

Currently, the foundation supports **validation only**. No infrastructure is created yet.

### Validate Configuration

To format, initialize (backend-less), and validate the Terraform code:

```bash
# Using the helper script
./scripts/aws/validate.sh

# Or via Makefile
make aws:validate
```

This ensures that:
*   Code is properly formatted (`terraform fmt`).
*   Syntax is valid (`terraform validate`).
*   Configuration is consistent.

## Planned Next Steps

This PR establishes the foundation. Subsequent PRs will implement:

1.  **Network Baseline**: VPC, Subnets, Route Tables, Internet/NAT Gateways.
2.  **Cluster Foundation**: EKS Control Plane and Worker Nodes.
3.  **Data Persistence**: RDS and Neo4j infrastructure.
4.  **Application Deploy**: Helm charts and ArgoCD bootstrapping.
5.  **Observability**: Full stack monitoring integration.

---
*Generated for AWS Path A Foundation*
