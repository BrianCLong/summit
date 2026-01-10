# Security Remediation Ledger

**Status:** Active
**Authority:** Security Governance

## Purpose

This ledger records security remediation status and governed exceptions referenced by extension governance. It anchors extension reviews to security posture evidence without redefining security policy.

## Authority Sources

- `docs/security/REMEDIATION_MAP.md`
- `docs/security/SECURITY_TODOS_ANALYSIS.md`

## Ledger Index

| Ledger Item            | Status | Evidence Source                            | Notes                                             |
| ---------------------- | ------ | ------------------------------------------ | ------------------------------------------------- |
| Remediation Map        | Active | `docs/security/REMEDIATION_MAP.md`         | Canonical vulnerability and remediation coverage. |
| Security Task Analysis | Active | `docs/security/SECURITY_TODOS_ANALYSIS.md` | Consolidated audit of security task findings.     |

## Governed Exceptions

Any exception recorded for an extension must reference one of the authority sources above and include the approving authority in the extension review checklist.
