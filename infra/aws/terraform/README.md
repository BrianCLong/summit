# AWS Path A Terraform Foundation

This directory contains the Terraform configuration for deploying the **Summit AWS Path A**.

## Usage

### Validation

To ensure the configuration is valid:

```bash
# From the root of the repository
./scripts/aws/validate.sh
```

Or use the Makefile:

```bash
make aws:validate
```

### Future State Management

In future phases (PR #2+), state will be managed remotely (e.g., S3 backend with DynamoDB locking).

For now, the foundation supports local validation only.

## Structure

*   `environments/`: Environment-specific variable definitions (e.g., `dev.tfvars`).
*   `modules/`: Reusable Terraform modules (to be implemented).
*   `*.tf`: Root module configuration.

## Requirements

See `versions.tf` for specific version constraints.

*   Terraform >= 1.5.0
*   AWS Provider ~> 5.0
