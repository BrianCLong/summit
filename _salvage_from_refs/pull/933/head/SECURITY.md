# Security Policy

## Supported Versions

| Version | Supported              |
| ------- | ---------------------- |
| 2.5.x   | ✅ Full support        |
| 2.0.x   | ⚠️ Security fixes only |
| < 2.0   | ❌ Not supported       |

## Reporting a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities to:

- Email: security@intelgraph.com
- GitHub Security Advisories: [Create a security advisory](https://github.com/BrianCLong/intelgraph/security/advisories)

### What to Include

1. **Description**: Clear description of the vulnerability
2. **Impact**: Potential impact and affected components
3. **Reproduction**: Step-by-step reproduction instructions
4. **Fix**: Suggested fix or mitigation (if known)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 5 business days
- **Fix Development**: Within 14 days for critical issues
- **Public Disclosure**: After fix is available and deployed

## Security Measures

### Code Scanning

- **SAST**: CodeQL analysis on every PR
- **Dependency Scanning**: Dependabot security updates
- **Container Scanning**: Trivy scans for Docker images
- **Secret Scanning**: Automated detection of committed secrets

### Branch Protection

- Required status checks including security scans
- Administrator enforcement enabled
- Signed commits preferred for sensitive changes

### Access Control

- CODEOWNERS enforcement for sensitive areas
- Multi-factor authentication required
- Principle of least privilege for repository access

### Incident Response

- Security incident playbook available
- Automated security monitoring and alerting
- Regular security drills and tabletop exercises

## Compliance

IntelGraph maintains compliance with:

- OWASP Top 10 security practices
- NIST Cybersecurity Framework
- SOC 2 Type II controls (in progress)
- GDPR data protection requirements

For compliance questions, contact: compliance@intelgraph.com

- Report vulnerabilities via GitHub Security Advisories or by contacting the security team at `security@intelgraph.example`.
- We aim to acknowledge reports within 48 hours and resolve critical vulnerabilities within 7 days.
- All secrets are rotated on a 90-day schedule.
