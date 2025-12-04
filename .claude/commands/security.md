# Security Scan Command

Run security scans and audits for the Summit platform.

## Quick Security Scan

```bash
pnpm security:scan
```

This runs both dependency audit and security linting.

## Individual Scans

### Dependency Audit
```bash
pnpm security:audit
```

### Security Linting
```bash
pnpm security:lint
```

### Check Outdated Dependencies
```bash
pnpm security:outdated
```

### Auto-Fix Audit Issues
```bash
pnpm security:audit:fix
```

## Secret Scanning

### Pre-Commit (Automatic)
Gitleaks runs automatically on commit via Husky hooks.

### Manual Scan
```bash
gitleaks detect --source=. --verbose
```

### Check Staged Files Only
```bash
gitleaks protect --staged --verbose
```

## Production Config Guard

Validates production configuration security:
```bash
pnpm ci:prod-guard
```

Checks for:
- Default JWT secrets
- Default database passwords
- Localhost in CORS allowlists
- Missing required secrets

## OWASP Checks

### Common Vulnerabilities to Check

1. **Injection (SQL, NoSQL, Command)**
   - Parameterized queries
   - Input validation
   - Escape user input

2. **Broken Authentication**
   - JWT validation
   - Session management
   - Password policies

3. **Sensitive Data Exposure**
   - No secrets in code
   - HTTPS enforcement
   - Proper encryption

4. **XSS (Cross-Site Scripting)**
   - Output encoding
   - Content Security Policy
   - Sanitize user input

5. **Security Misconfiguration**
   - Default credentials removed
   - Error messages sanitized
   - Headers configured

## Manual Security Review

For security-sensitive changes, check:

```markdown
## Security Checklist

### Input Validation
- [ ] All user input validated
- [ ] Parameterized queries used
- [ ] File uploads validated

### Authentication/Authorization
- [ ] Auth checks on all endpoints
- [ ] RBAC/ABAC policies correct
- [ ] Session handling secure

### Data Protection
- [ ] No secrets in code
- [ ] Sensitive data encrypted
- [ ] Logs sanitized

### API Security
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Input size limits
```

## CI Security Checks

The CI pipeline includes:
- `security.yml`: CodeQL analysis
- `trivy.yml`: Container scanning
- `sbom.yml`: SBOM generation
- Pre-commit: Gitleaks

## Reporting Vulnerabilities

If you find a security issue:
1. Do NOT create public issue
2. Contact security team directly
3. Provide detailed reproduction steps
4. Wait for fix before disclosure

## References

- [SECURITY/](../SECURITY/) - Security policies
- [docs/ZERO_TRUST_PLAN.md](../docs/ZERO_TRUST_PLAN.md) - Zero trust architecture
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
