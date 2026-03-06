# Secrets Policy

- No secrets in repo or CI logs.
- Kubernetes secrets via External Secrets or Sealed Secrets only.
- Terraform pulls secrets from AWS SSM/Secrets Manager (never variables).
- Emergency rotations documented in runbook; reason-for-access required.
