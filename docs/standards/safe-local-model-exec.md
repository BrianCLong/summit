# Standard: Safe Local Model Execution

## Overview
This standard defines the security requirements for running local or self-hosted AI models within the Summit development environment.

## Requirements
- **Isolation:** Each model must run in its own hardened container.
- **Least Privilege:** Containers must run as non-root users with read-only root filesystems.
- **Egress Control:** Egress is denied by default. Only allowlisted hosts are permitted.
- **Integrity:** Model weights must match an allowlisted SHA256 digest.
- **Auditability:** Every run must produce a deterministic receipt (`run.json`) and a temporal stamp (`stamp.json`).

## Enforcement
Compliance is enforced via the `tools/model-sandbox/run.sh` runner and CI guardrails.
