# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Status |
| ------- | ------ |
| v5.3.x  | GA Release Candidate (Active) |
| v5.2.x  | Maintenance (LTS) |
| < v5.0  | Deprecated |

## Hardening Summary (v5.3.1)

The platform has been hardened against common threat vectors:
- **Supply Chain**: All GitHub Actions pinned by SHA; OPA-based provenance gate enforced in CI.
- **Agentic Security**: Mandatory prompt injection detection in `BaseAgentArchetype`.
- **Auditing**: Tamper-evident, persistent `IAuditSink` for all privileged paths.
- **Secrets**: Cryptographically enforced minimum lengths and production environment guards.

## Reporting a Vulnerability

**DO NOT** create public GitHub issues for security vulnerabilities.

Please report security vulnerabilities by emailing: security@intelgraph.io

### Response Timeline
- **Acknowledgement**: Within 24 hours.
- **Triaging**: Within 72 hours.
- **Remediation**: 
  - *Critical*: 24 hours.
  - *High*: 7 days.
  - *Medium/Low*: 30 days.

## Disclosure Policy

We follow a 90-day coordinated disclosure policy. We will not publicly disclose a vulnerability until a patch is available or 90 days have passed since the initial report.