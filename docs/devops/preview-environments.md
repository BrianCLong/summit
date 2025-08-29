# Preview Environments Hardening

## 1. Purpose

This document outlines the hardening strategies for ephemeral preview environments, ensuring they are secure, cost-effective, and provide accurate representations of production.

## 2. Seeded Data

- **Strategy**: Use a subset of anonymized production data or synthetic data for seeding preview environments.
- **Implementation**:
  - Automated data seeding scripts as part of the environment provisioning process.
  - Ensure data is consistent across preview deployments for reliable testing.

## 3. Masked Secrets

- **Strategy**: Prevent sensitive information (e.g., production API keys, database credentials) from being exposed in preview environments.
- **Implementation**:
  - Use environment-specific secrets management (e.g., Kubernetes Secrets, Vault) with strict access controls.
  - Automated secret masking/redaction during deployment to preview environments.
  - Never hardcode secrets in configuration files.

## 4. Auto-TTL Cleanup

- **Strategy**: Automatically de-provision preview environments after a defined Time-To-Live (TTL) to manage costs and resource consumption.
- **Implementation**:
  - Configure TTLs (e.g., 24 hours, 7 days) for each preview environment.
  - Implement a cron job or a serverless function to periodically check and terminate expired environments.
  - Notify PR authors before environment expiration.

## 5. Per-PR URLs

- **Strategy**: Provide unique, stable URLs for each preview environment, making it easy to share and access.
- **Implementation**:
  - Dynamic DNS or ingress controllers to generate URLs based on PR number or branch name (e.g., `pr-123.intelgraph.com`).
  - Update PR comments with the live URL upon successful deployment.

## 6. Playwright Smoke Suite Integration

- **Strategy**: Automatically run a Playwright smoke test suite against each newly deployed preview environment.
- **Implementation**:
  - CI pipeline triggers the smoke tests after environment provisioning.
  - Report test results back to the PR for quick feedback.

## 7. Security Considerations

- Isolate preview environments from production networks.
- Implement network policies to restrict inbound/outbound traffic.
- Regularly scan preview environments for vulnerabilities.
