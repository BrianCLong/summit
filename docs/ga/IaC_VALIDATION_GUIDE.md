# IaC Validation Guide

This guide outlines the validation steps and policies for Infrastructure as Code (Terraform).

## Validation Pipeline

The CI pipeline executes the following checks:

1. **Syntax Check**: `terraform fmt -check` ensures code adheres to canonical formatting.
2. **Validation**: `terraform validate` checks for syntax errors and valid references.
3. **Semantic Validation**: `scripts/iac/validate-schema.js` enforces project-specific rules (e.g., tagging strategies, banned resources).
4. **Security Scanning**: `tfsec` and `checkov` scan for security vulnerabilities.

## Schema Rules

### Required Variables
All root modules must declare:
- `region`: AWS region (e.g., `us-west-2`)
- `environment`: Deployment environment (`dev`, `stage`, `prod`)
- `tags`: Map of standard tags (`Tenant`, `ManagedBy`, `Project`, `Environment`)

### Approved Providers
Only the following providers are whitelisted for general use:
- `hashicorp/aws`
- `hashicorp/random`
- `hashicorp/null`

## Adding New Resources

When adding new resources:
1. Run `./scripts/ci/validate-iac.sh` locally.
2. Ensure no new security warnings are introduced.
3. Update `iac/schema/config-schema.json` if new global configuration parameters are added.
