# Security Checklist & Regression Guardrails

## PR Security Checklist

Before merging any PR, verify:

- [ ] **Threat Model**: Does this change introduce new assets, trust boundaries, or data flows? If yes, update `SECURITY_THREAT_MODEL.md`.
- [ ] **Authentication**: Are all new endpoints protected by `ensureAuthenticated` or `ensureTenant`?
- [ ] **Authorization**: Is there an OPA policy covering the new capability?
- [ ] **Input Validation**: Are all inputs validated with Zod schemas?
- [ ] **Output Sanitization**: Is PII redaction active for new data fields?
- [ ] **Dependencies**: Are new dependencies pinned to specific versions?
- [ ] **Tests**: Is there at least one negative test case (e.g., access denied, invalid input)?

## Automated Checks

The following checks are enforced by CI:

1.  **Supply Chain**:
    - No unpinned dependencies (`npm run audit:deps`).
    - Trivy scan for container vulnerabilities.
    - SLSA provenance generation.

2.  **Code Security**:
    - Static Analysis (SAST) via CodeQL (planned).
    - Secret scanning.

3.  **Policy Enforcement**:
    - OPA policy checks for Kubernetes manifests and Terraform.

## Usage

Run the local security check script before pushing:

```bash
./scripts/security-check.sh
```
