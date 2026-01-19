# Controls Summary

**Version:** 1.0.0
**Scope:** Summit Cloud Platform

## Security Control Overview

The following table summarizes the key security controls implemented within the Summit platform, mapped to industry standards (SOC2, ISO 27001).

| Control Domain | Summary | Evidence Location |
| :--- | :--- | :--- |
| **Access Control** | MFA enforced for all users; RBAC for platform access. | `hardening/cloud-deployment.md` |
| **Data Protection** | AES-256 encryption at rest; TLS 1.2+ in transit. | `hardening/cloud-deployment.md` |
| **Vulnerability Mgmt** | Daily scans; Public VDP; Critical patches < 7 days. | `policies/VULNERABILITY_DISCLOSURE.md` |
| **Incident Response** | 24/7 Security On-call; Published contact info. | `policies/SECURITY_CONTACT.md` |
| **Software Integrity** | Signed release bundles; SBOM provided for all builds. | `artifacts/sbom/` |
| **Secure Development** | Mandatory code review; Static analysis in CI. | `docs/governance/GOVERNANCE.md` (Public) |

> For detailed audit evidence, please refer to the `artifacts/` directory and the full Evidence Bundle available upon request.
