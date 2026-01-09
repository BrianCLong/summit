# Summit Field Deployments Overview

This document provides an overview of the canonical deployment profiles for Summit. A deployment profile is a pre-configured set of infrastructure and application settings tailored for a specific environment and tenant profile.

## What is a Deployment Profile?

A deployment profile defines:
- The **infrastructure type** (cloud, on-prem, air-gapped).
- The **primary orchestration tool** (Docker Compose or Helm).
- The **tenant profile** it's designed for.
- **Required integrations**.
- The **observability stack** (basic or full).
- References to **backup and rollback strategies**.

## Choosing a Deployment Profile

The choice of deployment profile depends on the customer's environment and security requirements.

- **Cloud Standard**: For customers deploying on a cloud provider like AWS, GCP, or Azure.
- **On-Prem Enterprise**: For customers deploying in their own data centers.
- **Air-Gapped Natsec**: For customers with strict security requirements and no external network connectivity.

## Deployment Profile Catalog

| Profile               | Infrastructure Type | Tenant Profile        | Orchestration   | Notes                                      |
| --------------------- | ------------------- | --------------------- | --------------- | ------------------------------------------ |
| `cloud_standard`      | Cloud               | `enterprise_f100`     | Docker Compose  | Standard cloud deployment.                 |
| `onprem_enterprise`   | On-Prem             | `enterprise_f100`     | Helm            | For on-premise Kubernetes deployments.     |
| `airgapped_natsec`    | Air-Gapped          | `natsec_high_security`| Helm            | For disconnected environments.             |
