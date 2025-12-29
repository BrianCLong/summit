# Security Policy

This document outlines the Summit (IntelGraph) security policy, including coordinated disclosure expectations, severity rubric, and the guardrails enforced across CI/CD.

## Coordinated vulnerability disclosure

- **Contact:** Email `security@summit.ai` with detailed reproduction steps, affected components, and proof-of-concept where possible.
- **Do not** open public GitHub issues for security findings.
- **PGP option:** If encryption is required, request our PGP key via `security@summit.ai` and reference this policy in the subject.
- **Response targets:** Acknowledge within **24 hours**, provide triage decision within **72 hours**, and remediation plan with ETA within **5 business days** for valid reports.
- **Safe harbor:** We will not pursue legal action for good-faith research that respects privacy, avoids service disruption, and follows responsible disclosure timelines.

## Severity rubric

| Severity     | Criteria (examples)                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Remote code execution, unauthenticated data exfiltration, supply-chain tampering, or bypass of isolation controls affecting multiple tenants.                                      |
| **High**     | Authenticated privilege escalation, injection leading to data modification, persistent XSS across tenants, or loss of integrity for regulated data classes.                        |
| **Medium**   | Stored XSS scoped to a single tenant, SSRF with constrained blast radius, weak cryptography without immediate exploitation, or authorization gaps requiring complex preconditions. |
| **Low**      | Informational leaks without sensitive data, rate-limit bypasses without business impact, or misconfigurations with minimal exploitability.                                         |

We commit to prioritizing fixes according to the rubric above; Critical and High issues block releases until resolved or mitigated.

## Supply chain & CI/CD controls

Our pipelines enforce layered controls for every PR and release (see `.github/workflows/ci-security.yml` and release workflows):

- **Secret scanning:** `gitleaks` plus Trivy secret scanning fail builds on detections to prevent plaintext secrets from shipping.
- **SAST:** CodeQL (JavaScript/TypeScript, Go, Python) blocks on critical findings; Semgrep uses the `p/ci` ruleset for policy-as-code coverage.
- **Dependency scanning:** Snyk blocks merges on High/Critical issues; Trivy FS and container scans cover OS and app packages.
- **SBOM and signing:** Syft-generated CycloneDX SBOMs are published as CI artifacts and release assets, signed via cosign (OIDC keyless) alongside release bundles.
- **Provenance:** Container images are built with SLSA level 3 provenance, builder digest/timestamp attestations, and are verified in dedicated `verify-provenance` gates before deployment.
- **IaC and policy checks:** Checkov plus OPA/Conftest enforce misconfiguration and policy violations on Helm/Terraform assets.
- **DAST:** OWASP ZAP runs on staging to detect runtime regressions.

## Incident response

- **Detection:** Security alerts are aggregated via GitHub Security, Snyk, and infrastructure monitors; any Critical/High alert opens a PagerDuty incident.
- **Containment:** Access tokens and impacted credentials are rotated immediately; compromised services are isolated via network policy blocks.
- **Eradication & recovery:** Verified patches are deployed through the protected release pipeline with provenance verification; post-incident reviews are completed within 5 business days.

## Reporting a vulnerability

Please report any suspected vulnerability to `security@summit.ai` with as much detail as possible. Coordinated disclosure participants will receive status updates aligned to the response targets above. Thank you for helping us keep the Summit platform secure.
