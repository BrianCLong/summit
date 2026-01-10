# Security Posture

This document provides an overview of the security practices and automated checks embedded in the Summit platform's development lifecycle. Our approach is to build security into the development process, verifying the posture of the codebase automatically and continuously.

## Automated Security Gates

Our Continuous Integration (CI) pipeline, defined in ` .github/workflows/ci-security.yml`, enforces a suite of automated security checks on every proposed change. These gates include:

*   **Secret Scanning:** Utilizes Gitleaks to detect hardcoded secrets and credentials throughout the repository's history.
*   **Static Application Security Testing (SAST):** Employs CodeQL and Semgrep to identify potential vulnerabilities and policy violations in the source code.
*   **Dependency Vulnerability Scanning:** Uses Snyk to scan third-party dependencies for known vulnerabilities, failing builds if high-severity issues are found.
*   **Filesystem and Container Scanning:** Leverages Trivy to scan the filesystem and final container images for vulnerabilities and misconfigurations.
*   **Infrastructure-as-Code (IaC) Scanning:** Uses Checkov to analyze Terraform and Helm configurations for security best practice violations.
*   **Policy Enforcement:** Applies Open Policy Agent (OPA) and Conftest to validate the configuration of our infrastructure and applications against defined policies.
*   **CIS Benchmark Validation:** Uses Trivy to check Kubernetes configurations against Center for Internet Security (CIS) benchmarks.
*   **Dynamic Application Security Testing (DAST):** Runs an OWASP ZAP baseline scan against a live instance of the application to identify runtime vulnerabilities.

## How to Run Verification

The full security suite is orchestrated by our CI pipeline. The primary verification command for local validation of core functionality is the "Golden Path" smoke test:

```bash
make smoke
```

For a comprehensive understanding of all security checks, refer to the CI workflow configuration file: ` .github/workflows/ci-security.yml`.

## Risk Management and Disclosure

We maintain a transparent and proactive approach to risk management.

### Risk Ledger

All identified architectural and security risks are tracked in the [Risk Ledger](./../RISK_LEDGER.md). This document provides a detailed description of each risk, its current status, and a corresponding neutralization strategy.

### Deferred Risks and Capabilities

As part of our development methodology, certain capabilities are intentionally deferred to future releases. These are not considered technical debt but are managed design choices. The following capabilities are deferred, as documented in the [Summit Readiness Assertion](./../SUMMIT_READINESS_ASSERTION.md):

*   **Autonomous Agent Loop:** The "Agentic Mesh" is restricted to "Human-in-the-Loop" (HITL) mode.
*   **Real-time Cognitive Warfare Defense:** The "PsyOps" defense module operates in "Passive/Analysis" mode only.
*   **Predictive Geopolitics:** The "Oracle" subsystem is currently running on simulated historical data.
