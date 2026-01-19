# Cloud Security Baseline Controls

This document defines the baseline security controls enforced on all cloud infrastructure deployments.

## IaC Scanning

All Terraform code is scanned by **tfsec** and **Checkov** in the CI pipeline.

### Enforced Controls

| ID | Control | Tool | Description |
|----|---------|------|-------------|
| SEC-001 | S3 Bucket Encryption | tfsec | All S3 buckets must have server-side encryption enabled. |
| SEC-002 | S3 Public Access | tfsec | Public access blocks must be enabled on all buckets. |
| SEC-003 | RDS Encryption | tfsec | RDS instances must be encrypted at rest. |
| SEC-004 | Security Group Open Ports | checkov | Security groups should not have 0.0.0.0/0 open for SSH/RDP. |
| SEC-005 | IAM Least Privilege | checkov | IAM policies should not allow full '*' access. |

## Compliance Mapping

These controls map to SOC 2 CC6.1 (Logical Access Security) and CC7.1 (System Operations).

## Exclusions

Exclusions must be documented in code comments with a justification:
```hcl
# tfsec:ignore:aws-s3-enable-bucket-encryption
resource "aws_s3_bucket" "public_assets" {
  # ... justification: public static assets only
}
```
