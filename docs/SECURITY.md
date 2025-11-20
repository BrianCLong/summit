# Security Guidelines

This document outlines security best practices and guidelines for the IntelGraph platform.

## Table of Contents

1. [Security Policy](#security-policy)
2. [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
3. [Secure Development Practices](#secure-development-practices)
4. [Common Vulnerabilities and Prevention](#common-vulnerabilities-and-prevention)
5. [Security Tools and Automation](#security-tools-and-automation)
6. [Dependency Management](#dependency-management)
7. [Authentication and Authorization](#authentication-and-authorization)
8. [Data Protection](#data-protection)

## Security Policy

### Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

### Security Update Timeline

- **Critical**: Patched within 24 hours
- **High**: Patched within 7 days
- **Medium**: Patched within 30 days
- **Low**: Addressed in next release

## Reporting Security Vulnerabilities

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security vulnerabilities by emailing: security@intelgraph.io

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 24 hours and provide a detailed response within 7 days.

## Secure Development Practices

### 1. Input Validation and Sanitization

**Always validate and sanitize user input.**

```typescript
import { sanitizeString, validateEmail, sanitizeFilePath } from '@/utils/input-sanitization';

// Sanitize string input
const safeName = sanitizeString(userInput);

// Validate email
const email = validateEmail(userEmail);

// Sanitize file paths
const safePath = sanitizeFilePath(filePath, '/allowed/base/path');
```

### 2. SQL Injection Prevention

**Always use parameterized queries.**

✅ **Good:**
```typescript
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

❌ **Bad:**
```typescript
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### 3. XSS Prevention

**Never inject unsanitized user input into HTML.**

✅ **Good:**
```typescript
import { sanitizeHTML } from '@/utils/input-sanitization';

const safeHTML = sanitizeHTML(userInput, ['b', 'i', 'p']);
element.innerHTML = safeHTML;
```

❌ **Bad:**
```typescript
element.innerHTML = userInput;
```

### 4. Command Injection Prevention

**Avoid executing shell commands with user input.**

✅ **Good:**
```typescript
import { sanitizeShellInput } from '@/utils/input-sanitization';

// Better: Use libraries instead of shell commands
const result = await someLibrary.process(input);
```

❌ **Bad:**
```typescript
exec(`process ${userInput}`);
```

### 5. Path Traversal Prevention

**Always validate file paths.**

✅ **Good:**
```typescript
import { sanitizeFilePath } from '@/utils/input-sanitization';

const safePath = sanitizeFilePath(userPath, '/uploads');
```

❌ **Bad:**
```typescript
fs.readFile(`/uploads/${userPath}`);
```

### 6. Cryptographically Secure Random

**Never use Math.random() for security-sensitive operations.**

✅ **Good:**
```typescript
import { randomString, randomUUID, generateToken } from '@/utils/crypto-secure-random';

const token = generateToken(32);
const sessionId = randomUUID();
const apiKey = randomString(64);
```

❌ **Bad:**
```typescript
const token = Math.random().toString(36);
```

### 7. CORS Configuration

**Never use wildcard CORS origins in production.**

✅ **Good:**
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

❌ **Bad:**
```typescript
app.use(cors({
  origin: '*',
  credentials: true
}));
```

## Common Vulnerabilities and Prevention

### OWASP Top 10

1. **Broken Access Control**
   - Implement proper authorization checks
   - Use role-based access control (RBAC)
   - Validate permissions on every request

2. **Cryptographic Failures**
   - Use Argon2 for password hashing
   - Use crypto.randomBytes() for tokens
   - Never store passwords in plaintext

3. **Injection**
   - Use parameterized queries
   - Validate and sanitize all input
   - Use ORMs with built-in protection

4. **Insecure Design**
   - Threat modeling during design
   - Security requirements in user stories
   - Principle of least privilege

5. **Security Misconfiguration**
   - Disable debug mode in production
   - Remove default credentials
   - Keep dependencies updated

6. **Vulnerable and Outdated Components**
   - Regular dependency audits
   - Automated vulnerability scanning
   - Update dependencies promptly

7. **Identification and Authentication Failures**
   - Implement MFA
   - Use secure session management
   - Implement rate limiting

8. **Software and Data Integrity Failures**
   - Use signed packages
   - Implement CI/CD security
   - Verify dependencies

9. **Security Logging and Monitoring Failures**
   - Log security events
   - Monitor for anomalies
   - Set up alerts

10. **Server-Side Request Forgery (SSRF)**
    - Validate URLs
    - Whitelist allowed domains
    - Disable redirects

## Security Tools and Automation

### Pre-commit Hooks

Security checks run automatically before each commit:

```bash
# Install pre-commit hooks
npm run prepare

# Pre-commit checks include:
# - Secret scanning (gitleaks)
# - Security linting (eslint-plugin-security)
# - Standard linting
# - Type checking
# - Dependency audit
```

### CI/CD Security Scanning

Automated security scans run on every push:

- **Dependency Scanning**: `pnpm audit`
- **Secret Scanning**: Gitleaks
- **Security Linting**: ESLint security plugin
- **CodeQL Analysis**: GitHub Advanced Security
- **SAST**: Snyk

### Manual Security Audit

```bash
# Run dependency audit
pnpm audit --audit-level=moderate

# Run security linting
pnpm exec eslint --config .eslintrc.security.cjs 'server/src/**/*.{js,ts}'

# Scan for secrets
gitleaks detect --source . --verbose

# Check for known CVEs
pnpm outdated
```

## Dependency Management

### Keeping Dependencies Updated

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update --latest

# Update specific package
pnpm update package-name --latest

# Audit for vulnerabilities
pnpm audit

# Fix vulnerabilities automatically
pnpm audit --fix
```

### Security Advisories

Subscribe to security advisories:
- GitHub Security Advisories
- npm Security Advisories
- Snyk Vulnerability Database

## Authentication and Authorization

### Password Security

- **Hashing**: Use Argon2 (implemented in AuthService.ts)
- **Minimum Length**: 12 characters
- **Complexity**: Require mix of characters
- **Storage**: Never log or expose passwords

### JWT Tokens

- **Signing**: Use strong secret (256-bit minimum)
- **Expiration**: Short-lived tokens (24 hours)
- **Refresh Tokens**: Implement token rotation
- **Blacklisting**: Revoke compromised tokens

### Session Management

- **Session IDs**: Cryptographically random
- **Timeout**: Implement idle timeout
- **Revocation**: Support logout from all devices
- **Storage**: Secure session storage

### API Keys

- **Generation**: Use crypto.randomBytes(32)
- **Storage**: Hash before storing
- **Transmission**: HTTPS only
- **Rotation**: Support key rotation

## Data Protection

### Encryption

- **At Rest**: Encrypt sensitive data in database
- **In Transit**: Enforce HTTPS/TLS 1.3+
- **Keys**: Store in environment variables or secrets manager

### PII Handling

- **Minimization**: Only collect necessary data
- **Redaction**: Implement PII redaction in logs
- **Retention**: Implement data retention policies
- **Access Control**: Strict access to PII

### Logging

- **Never Log**: Passwords, tokens, API keys, PII
- **Sanitize**: Remove sensitive data before logging
- **Structured**: Use structured logging
- **Monitoring**: Monitor for security events

## Security Checklist

Before deploying to production:

- [ ] All dependencies are up to date
- [ ] No high/critical vulnerabilities in dependencies
- [ ] Security linting passes
- [ ] All tests pass
- [ ] No secrets in code or config
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Authentication required
- [ ] Authorization checks in place
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Backup system in place

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Contact

For security-related questions: security@intelgraph.io
