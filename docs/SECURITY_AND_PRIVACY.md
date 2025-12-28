---
title: Security & Privacy
summary: Contract-grade overview of Summit security and privacy posture.
version: 2025.12
lastUpdated: 2025-12-27
owner: Security
status: public
---

# Security & Privacy

## Documentation Contract Summary

**Guarantees**

- Describes active security and privacy controls for MVP-3 GA deployments.
- Security controls are enforced via policy and documented governance artifacts.

**Not Guaranteed**

- Certification claims (SOC 2, FedRAMP, ISO) unless explicitly stated elsewhere.
- Security outcomes under misconfiguration or unsupported deployment profiles.

**Conditional**

- Controls depend on configured policies, tenant settings, and deployment-specific hardening.
- Optional provenance signing requires enabling the signing pipeline.

**Out of Scope**

- Customer-specific risk acceptance, legal determinations, or regulator communications.

**Failure Modes**

- Policy violations are blocked by default-deny rules and must be remediated before deployment.
- Secret scanning failures will block commits and CI promotion.

**Evidence Links**

- [COMPLIANCE_CONTROLS.md](COMPLIANCE_CONTROLS.md)
- [SECURITY_VALIDATION.md](SECURITY_VALIDATION.md)
- [SECURITY_MITIGATIONS.md](../SECURITY_MITIGATIONS.md)

## Security Controls (MVP-3 GA)

- **AuthN/Z**: JWT + ABAC policy enforcement with default-deny behavior.
- **Data Minimization**: Store only necessary fields; redact PII in logs where configured.
- **Secrets**: gitleaks PR gate; GitHub secret scanning + push protection.
- **SBOM & Scans**: Dependabot, pip-audit/npm audit, CodeQL for public repos.
- **Provenance Integrity**: Optional signing (cosign) + anchoring (see `ADR/0002`).
