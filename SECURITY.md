# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to our team directly:

- **Email**: security@summit.dev
- **GitHub Security Advisories**: Use the "Security" tab in this repository
- **For urgent P0 security issues**: Include "[P0-SECURITY]" in the subject line

### What to Include

When reporting a vulnerability, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** assessment
4. **Suggested fix** (if known)
5. **Your contact information** for follow-up

### Response Timeline

- **Initial Response**: Within 24 hours
- **Assessment**: Within 72 hours
- **Fix Timeline**:
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release cycle

## Security Best Practices

### For Contributors

1. **Never commit secrets** to the repository
2. **Use environment variables** for configuration
3. **Follow least privilege** principles
4. **Keep dependencies updated**
5. **Run security scans** locally before submitting PRs

### For Deployments

1. **Enable Release Captain** for all production deployments
2. **Use environment-specific secrets** management
3. **Monitor security alerts** in GitHub
4. **Regular security audits** with `npm audit`
5. **Implement proper access controls**

## Secret Rotation Procedures

If you accidentally commit a secret or suspect a secret has been compromised:

### Immediate Actions (< 15 minutes)

1. **Revoke the compromised secret** immediately
2. **Generate a new secret** with the same permissions
3. **Update the secret** in all deployment environments
4. **Test the application** to ensure it's still functional

### Follow-up Actions (< 1 hour)

1. **Create an incident issue** using the template:
   ```bash
   gh issue create --title "🚨 Secret Rotation: [SECRET_TYPE]" \
     --body "Secret compromised and rotated. Details in private channel." \
     --label "security,incident,secret-rotation"
   ```

2. **Notify the security team** via secure channel
3. **Review access logs** for any unauthorized usage
4. **Update documentation** with new secret references

### Git History Cleanup

```bash
# Remove secret from git history (use with caution)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file/with/secret' \
  --prune-empty --tag-name-filter cat -- --all

# Alternative: Use BFG Repo Cleaner
java -jar bfg.jar --delete-files secret-file.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Security Tools and Automation

### Enabled Security Features

- ✅ **Dependabot** - Automated dependency updates
- ✅ **CodeQL** - Static code analysis
- ✅ **Gitleaks** - Secret scanning
- ✅ **NPM Audit** - Vulnerability scanning
- ✅ **SARIF Upload** - Security findings tracking
- ✅ **Branch Protection** - Prevents direct pushes to main

### Manual Security Checks

```bash
# Run full security audit
npm audit --audit-level moderate

# Check for secrets in code
git grep -iE "(password|secret|token|api[_-]?key)" -- '*.ts' '*.js' '*.json'

# Validate Helm charts
helm lint charts/*/

# Test OPA policies
opa test .github/policies/
```

## Incident Response

### Security Incident Types

1. **P0 - Active Exploit**: Immediate response required
2. **P1 - Data Breach**: < 4 hours response
3. **P2 - Vulnerability**: < 24 hours response
4. **P3 - Compliance**: < 1 week response

### Response Team

- **Incident Commander**: @BrianCLong
- **Security Lead**: @security-team
- **Engineering Lead**: @platform-team
- **Communications**: @leadership-team

### Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Security Team | security@summit.dev | 24/7 |
| Platform Team | platform@summit.dev | Business hours |
| Leadership | leadership@summit.dev | On-call |

## Compliance and Auditing

### Audit Trails

All security-related actions are logged:

- **Release Captain decisions** → GitHub Issues
- **Emergency overrides** → Audit issues with full context
- **Secret rotations** → Security team notifications
- **Policy violations** → SARIF reports and PR comments

### Compliance Frameworks

- **SOC 2 Type II** - Annual audit
- **ISO 27001** - Continuous monitoring
- **GDPR** - Data protection compliance
- **CCPA** - California privacy compliance

## Security Training

### Required Training

All team members must complete:

1. **Security Awareness Training** (annual)
2. **Secure Coding Practices** (quarterly)
3. **Incident Response Procedures** (semi-annual)
4. **Release Captain Training** (one-time)

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Release Captain Security Guide](./RUNBOOKS/release-captain-verification.md)

## Contact Information

- **Security Team**: security@summit.dev
- **General Security Questions**: platform@summit.dev
- **Emergency Security Issues**: Call/text the on-call engineer

---

*This security policy is reviewed quarterly and updated as needed.*
*Last updated: 2024-12-21*