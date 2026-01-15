# Security Policy

## Reporting a Vulnerability

**We take security seriously.** If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of the following channels:

1. **GitHub Security Advisories** (Preferred):
   - Navigate to the [Security tab](https://github.com/BrianCLong/summit/security/advisories)
   - Click "Report a vulnerability"
   - Fill out the advisory form with details

2. **Email:**
   - Send details to: [security contact to be added]
   - Use PGP encryption if possible (key available on request)

3. **Security Platform:**
   - [Platform details to be configured if applicable]

### What to Include

When reporting a vulnerability, please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** assessment
- **Affected versions** or components
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### Response Timeline

We are committed to responding promptly to security reports:

| Timeline                   | Action                                        |
| -------------------------- | --------------------------------------------- |
| **Within 48 hours**        | Acknowledge receipt of your report            |
| **Within 5 business days** | Initial triage and severity assessment        |
| **Within 30 days**         | Provide a fix or detailed mitigation plan     |
| **Within 90 days**         | Coordinated public disclosure (if applicable) |

**Note:** Complex vulnerabilities may require additional time. We will keep you informed of progress.

---

## Supported Versions

We provide security updates for the following versions:

| Version           | Supported  | Notes                                  |
| ----------------- | ---------- | -------------------------------------- |
| 4.x (main branch) | ✅ Yes     | Current release - receives all updates |
| 3.x               | ⚠️ Limited | Critical security fixes only until EOL |
| < 3.0             | ❌ No      | End of life - please upgrade           |

**Recommendation:** Always use the latest stable release from the `main` branch.

---

## Security Update Process

### For Critical Vulnerabilities (CVSS ≥ 9.0)

1. **Immediate response** within 24 hours
2. **Emergency patch** released within 72 hours
3. **Public disclosure** coordinated with reporter
4. **Security advisory** published on GitHub

### For High/Moderate Vulnerabilities (CVSS 4.0-8.9)

1. **Acknowledge** within 48 hours
2. **Patch** included in next scheduled release (or sooner)
3. **Security advisory** published after patch is available

### For Low Vulnerabilities (CVSS < 4.0)

1. **Triage** within 5 business days
2. **Fix** scheduled for upcoming release
3. **Documented** in changelog and release notes

---

## Disclosure Policy

We follow **coordinated disclosure**:

1. **Reporter notifies us** of vulnerability
2. **We acknowledge and investigate**
3. **We develop and test a fix**
4. **We notify the reporter** when fix is ready
5. **We release the fix** to all supported versions
6. **Public disclosure** occurs 7-14 days after fix release

We will credit security researchers who report vulnerabilities responsibly (unless they prefer to remain anonymous).

---

## Security Researcher Recognition

We appreciate the security research community and will:

- ✅ Publicly acknowledge your contribution (with your permission)
- ✅ Credit you in the security advisory and release notes
- ✅ List you in our security Hall of Fame (if you wish)
- ✅ Provide swag/recognition (for significant findings)

**Note:** This is not a bug bounty program, but we deeply value your contributions.

---

## Security Best Practices for Contributors

If you're contributing to this project:

### Do's

- ✅ **Use environment variables** for sensitive configuration
- ✅ **Never commit secrets** (API keys, passwords, tokens)
- ✅ **Validate all user input** at system boundaries
- ✅ **Use parameterized queries** to prevent SQL injection
- ✅ **Enable HTTPS/TLS** for all network communication
- ✅ **Keep dependencies updated** (Dependabot monitors this)
- ✅ **Run security scans** before submitting PRs
- ✅ **Follow least privilege** principle for permissions

### Don'ts

- ❌ **Don't disable security features** without discussion
- ❌ **Don't use deprecated packages** with known vulnerabilities
- ❌ **Don't bypass authentication/authorization** checks
- ❌ **Don't log sensitive data** (passwords, tokens, PII)
- ❌ **Don't use weak cryptography** (MD5, SHA1 for security)
- ❌ **Don't trust client-side validation** alone

---

## Automated Security Controls

This repository has the following security measures in place:

### Continuous Monitoring

- ✅ **Dependabot** - Automated dependency vulnerability scanning (weekly)
- ✅ **CodeQL** - Static analysis for JavaScript and Python
- ✅ **Semgrep** - Policy-as-code security scanning
- ✅ **Gitleaks** - Secret scanning in commits and PRs
- ✅ **Trivy** - Container and filesystem vulnerability scanning
- ✅ **SBOM Generation** - Software Bill of Materials (CycloneDX)
- ✅ **SLSA Provenance** - Supply chain integrity attestations

### CI/CD Security Gates

All pull requests must pass:

- ✅ Security workflow (`ci-security.yml`)
- ✅ SBOM scan with critical severity cutoff
- ✅ Secret scanning (blocking)
- ✅ License compliance checks
- ✅ Code quality and linting

**Note:** Security checks are mandatory and cannot be bypassed without security team approval.

---

## Known Security Limitations

### Current Risk Acceptance

The following vulnerabilities are documented and accepted with mitigations:

| CVE            | Component                         | Severity | Mitigation                                                                                       | Review Date |
| -------------- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------ | ----------- |
| CVE-2022-24434 | dicer (via apollo-server-express) | HIGH     | Request size limits, rate limiting, monitoring. Upgrade to Apollo Server v4 planned for Q1 2026. | 2026-01-02  |

See [`docs/security/CVE-2022-24434-MITIGATION.md`](../../docs/security/CVE-2022-24434-MITIGATION.md) for details.

### Audit Exceptions

The following CVEs are in the audit ignore list with documented justification:

- **CVE-2024-22363** - [Justification to be documented]
- **CVE-2023-30533** - [Justification to be documented]

---

## Security Architecture

### Defense in Depth

This project implements multiple layers of security:

1. **Network Layer:** TLS/HTTPS, rate limiting, WAF
2. **Application Layer:** Input validation, output encoding, CSRF protection
3. **Data Layer:** Encryption at rest, parameterized queries, least privilege
4. **Infrastructure Layer:** Container security, secrets management, network policies
5. **Supply Chain:** SBOM, provenance, signed commits, pinned dependencies

### Threat Model

Key threats we defend against:

- **Injection attacks** (SQL, command, XSS, etc.)
- **Authentication/authorization bypass**
- **Sensitive data exposure**
- **Supply chain compromise**
- **Denial of service**
- **Insecure dependencies**

---

## Compliance & Standards

This project aligns with:

- **OWASP Top 10** (2021) mitigation strategies
- **CWE Top 25** awareness and prevention
- **NIST Cybersecurity Framework** principles
- **SLSA Level 2+** supply chain security
- **SSDF** (Secure Software Development Framework)

---

## Security Contact

For security-related questions or concerns:

- **Security Team:** [Contact to be configured]
- **GPG Key:** Available on request
- **Response Time:** Within 48 hours during business days

---

## Additional Resources

- [Security Sweep Report](../../docs/security/SECURITY_SWEEP_REPORT.md)
- [Security Posture Documentation](../../docs/security/SECURITY_POSTURE.md)
- [CVE Mitigation Strategies](../../docs/security/)
- [Security Workflow](../.github/workflows/ci-security.yml)

---

**Last Updated:** 2026-01-02
**Next Review:** Quarterly (2026-04-01)
