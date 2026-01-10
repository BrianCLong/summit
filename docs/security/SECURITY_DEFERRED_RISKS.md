# Security Deferred Risks for MVP-4 GA

This document lists all security-related risks that are explicitly deferred for the MVP-4 GA release. Deferral is based on a risk assessment that deems them acceptable for the initial GA, with a commitment to address them post-release.

| ID | Deferred Item | Reason | Scope | Owner | Ticket / Next Action | Justification for GA |
|----|---------------|--------|-------|-------|----------------------|----------------------|
| 1  | `pnpm audit` CI gate is disabled | The current dependency tree has known vulnerabilities that require triage. Enabling the gate would block the release. | CI/CD (`mvp4-gate.yml`) | Security Team | Post-GA-Triage-Dependencies | The risk is understood and contained. A full triage is planned for Week 1 post-GA. Secret scanning and other gates are active. |
| 2  | OPA policy regressions could deny service | The current test suite for policies is robust but does not cover all edge cases of runtime data. | Security / OPA Policies | Policy Team | Enhance-Policy-Contract-Tests | The default-deny posture and rapid rollback capability are considered sufficient mitigation for GA. |
| 3  | Secrets bootstrap misconfiguration blocks startup | The current preflight validation is basic. A more robust validation mechanism is needed. | Security / Service Configuration | Platform Team | Improve-Secret-Validation | The risk is confined to startup and is mitigated by deployment runbooks and monitoring. |
