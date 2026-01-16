# Security & Compliance

## Security Posture
Summit is built with a "Secure by Default" philosophy.

### Application Security
- **Authentication:** Enforced MFA, SSO support.
- **Authorization:** Granular RBAC (Role-Based Access Control).
- **Encryption:**
  - **In-Transit:** TLS 1.2+ for all communications.
  - **At-Rest:** AES-256 encryption for database volumes and S3 buckets.
- **Vulnerability Management:** Daily scanning of container images and dependencies (Trivy, Snyk).

### Infrastructure Security
- **Network:** Private subnets for data stores; strict security groups/firewalls.
- **Access:** Least-privilege IAM roles; no direct SSH access to production nodes.
- **Secrets:** Managed via AWS Secrets Manager / HashiCorp Vault.

## Compliance
- **SOC 2 Type II:** [Link to Trust Portal]
- **GDPR/CCPA:** Fully compliant; data residency options available.
- **ISO 27001:** Aligned controls.

## Artifacts Available
- Penetration Test Summary
- SOC 2 Report
- SIG Questionnaire
- SBOM (Software Bill of Materials)
