# Security Policy
- **Supported branches:** main, release/*
- **Report vulnerabilities:** security@yourdomain.example (PGP preferred)
- **Secret handling:** SOPS + age (see .sops.yaml); no plaintext secrets in repo.
- **CI gates:** SBOM (Syft), vuln scan (Grype/Trivy), IaC scans (Checkov/TFLint), CodeQL.
- **Dependencies:** Dependabot enabled; Renovate optional.
- **Incident response:** Create `security:` labeled issue, page on-call, capture TTR/TTC metrics.
