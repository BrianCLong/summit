# Security Compliance Automation

**Sprint:** 2 (Security)
**Status:** Implemented
**Owner:** Security Engineering

---

## Overview

This document details the automated security controls implemented as part of the Zero Trust initiative. We have expanded Role-Based Access Control (RBAC), introduced container hardening automation, and integrated adversarial testing (Policy Fuzzing) into our CI/CD pipeline.

## 1. Expanded RBAC Policies

We have introduced granular roles to support the AI/ML and Audit workflows.

### New Roles

| Role | Access Scope | Policy File |
|------|--------------|-------------|
| **Data Scientist** | Read/Train/Eval on `ml_model`, Read/Write `dataset` | `policy/data_science.rego` |
| **Auditor** | Read-only access to `audit_log`, `compliance_report` | `policy/auditor.rego` |

### Testing
Policies are verified with unit tests in `policy/tests/`.

## 2. Container Hardening

We enforce a "Secure by Design" approach for all container images.

### Hardening Script
The script `security-hardening/harden_container.sh` serves as a gatekeeper for Dockerfiles. It validates:
- **Non-root execution:** Enforces `USER` instruction (recommended UID 65532).
- **Immutable Base Images:** Checks for SHA256 digest pinning.
- **Secret Scanning:** Greps for potential leaked credentials.
- **Least Privilege:** Flags `sudo` usage.

**Usage:**
```bash
./security-hardening/harden_container.sh path/to/Dockerfile
```

## 3. Policy Fuzzing

To prevent regression and detect logical flaws in our governance layer, we utilize `policy-fuzzer`, a Python-based adversarial testing tool.

### Architecture
- **ChekistCopilot:** An aggressive agent attempting to bypass rules using synonym dodges and grammar injection.
- **MechaChekaCollective:** A swarm intelligence orchestrator for multi-vector attacks.

### CI Integration
The fuzzer runs automatically on every Pull Request modifying `policy/` or `policy-fuzzer/` files via GitHub Actions (`.github/workflows/policy-fuzzing.yml`).

## 4. Future Roadmap

- **Kubernetes Gatekeeper:** Compile Rego policies to Constraints for OPA Gatekeeper.
- **Runtime Enforcement:** Integrate hardening checks into the K8s admission controller.
- **Secret Scanning V2:** Replace grep-based scan with `gitleaks` or `trufflehog` integration.

---

**Generated:** Q4 2025
**Classification:** INTERNAL
