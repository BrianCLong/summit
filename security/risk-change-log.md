# Security Risk Change Log

Record security alert responses and mitigations for auditability.

| Date         | Alert/CVE                       | Severity                 | Component       | Actioned By | Mitigation / Fix                                                             | Residual Risk                   | Evidence                                         |
| ------------ | ------------------------------- | ------------------------ | --------------- | ----------- | ---------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| _YYYY-MM-DD_ | _CVE-XXXX-YYYY_                 | Critical/High/Medium/Low | Service/Package | @owner      | Patch version, config change, feature flag, WAF/rate-limit update            | e.g., "post-mitigation: medium" | Links to PR, SBOM diff, attestation, CI run      |
| 2026-01-02   | Secret-scanning enforcement gap | High                     | CI/Gitleaks     | @Codex      | Converted warn-only PR scan to blocking with baseline guard and failure gate | post-mitigation: low            | Workflow: .github/workflows/secret-scan-warn.yml |
