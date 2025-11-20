# Security Policy

## 📋 Table of Contents

- [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
- [Security Autopilot Overview](#security-autopilot-overview)
- [Security Gates & Requirements](#security-gates--requirements)
- [Automated Security Checks](#automated-security-checks)
- [Cryptographic Standards](#cryptographic-standards)
- [Secret Management](#secret-management)
- [Dependency Management](#dependency-management)
- [Security Exception Process](#security-exception-process)
- [Response Timeline](#response-timeline)

---

## 🚨 Reporting Security Vulnerabilities

**Please DO NOT open public issues for security vulnerabilities.**

Report security vulnerabilities through one of these channels:

1. **GitHub Security Advisories** (Preferred)
   - Navigate to: `https://github.com/[org]/summit/security/advisories/new`
   - This creates a private security advisory

2. **Email**
   - Contact: `security@intelgraph.example`
   - Use PGP key (fingerprint: TBD) for sensitive information

3. **Bug Bounty Program**
   - Details: TBD

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)
- Your contact information

---

## 🤖 Security Autopilot Overview

Every push and pull request to this repository triggers our **Security Autopilot** - an automated security pipeline that runs comprehensive security checks. No code can be merged to `main` without passing all critical security gates.

### What Gets Checked

```
┌─────────────────────────────────────────────────────────┐
│                   Security Autopilot                     │
├─────────────────────────────────────────────────────────┤
│ 1. SAST (Static Analysis)          → CodeQL            │
│ 2. Secret Detection                → Gitleaks          │
│ 3. Dependency Scanning              → pnpm audit       │
│ 4. Container Security               → Trivy            │
│ 5. Crypto Hygiene                   → Custom checks    │
│ 6. DAST (Dynamic Analysis)          → OWASP ZAP        │
│ 7. Security Gates                   → Policy checks    │
└─────────────────────────────────────────────────────────┘
```

**Status**: Every PR receives a security status comment with clear pass/fail indicators.

**Workflow**: `.github/workflows/security-autopilot.yml`

---

## 🔒 Security Gates & Requirements

### Critical Gates (MUST PASS - Blocks Merge)

These checks will **fail the PR** if violations are detected:

#### 1. No Secrets in Code
- ❌ No hardcoded API keys, passwords, or tokens
- ❌ No private keys committed to repository
- ❌ No `.env` files in git history
- ✅ All secrets must come from environment variables or secret stores

**Check**: Gitleaks + pattern matching
**Location**: `.github/workflows/security-autopilot.yml` (secret-detection job)

#### 2. No Critical/High Vulnerabilities
- ❌ No CRITICAL severity CVEs in dependencies
- ❌ No HIGH severity CVEs in dependencies (unless explicitly allowed)
- ✅ All dependencies must be regularly updated

**Check**: pnpm audit + Trivy
**Exceptions**: See `.security/allowlist.yaml`
**Location**: `.github/workflows/security-autopilot.yml` (dependency-scan, trivy-scan jobs)

#### 3. Crypto Hygiene
- ❌ No deprecated algorithms (MD5, SHA1, DES, RC4, 3DES)
- ❌ No hardcoded cryptographic keys
- ✅ All crypto operations must use KMS or approved libraries
- ✅ Only FIPS 140-2 approved algorithms

**Approved Algorithms**:
- **Symmetric**: AES-256-GCM, AES-192-GCM, AES-128-GCM
- **Asymmetric**: RSA (≥2048 bits), ECDSA (P-256, P-384), Ed25519
- **Hash**: SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-384, SHA3-512
- **KDF**: PBKDF2, scrypt, Argon2, HKDF

**Check**: Custom crypto hygiene checker
**Location**: `.security/crypto-hygiene-checker.cjs`

#### 4. No SAST Security Issues
- ❌ No SQL injection vulnerabilities
- ❌ No XSS (Cross-Site Scripting) vulnerabilities
- ❌ No command injection vulnerabilities
- ❌ No path traversal vulnerabilities

**Check**: CodeQL
**Location**: `.github/workflows/security-autopilot.yml` (sast-codeql job)

### Warning Gates (Review Required - Non-Blocking)

These checks generate warnings but don't block merge:

- Container security best practices
- Security header configuration
- Code owner assignments for security-critical paths
- Documentation currency
- Rate limiting implementation
- Input validation library usage

**Check**: Security gates checker
**Location**: `.security/security-gates-checker.sh`

---

## 🔍 Automated Security Checks

### 1. SAST (Static Application Security Testing)

**Tool**: GitHub CodeQL
**Languages**: JavaScript, TypeScript, Python
**Frequency**: Every push and PR
**Queries**: `security-and-quality`

**What it detects**:
- SQL injection
- XSS (Cross-Site Scripting)
- Command injection
- Path traversal
- Insecure deserialization
- Authentication bypasses
- Authorization issues

**Results**: Available in GitHub Security tab

### 2. Secret Detection

**Tool**: Gitleaks
**Frequency**: Every push and PR
**Scope**: Full git history

**What it detects**:
- AWS credentials
- API keys
- Private keys
- Database credentials
- OAuth tokens
- JWT secrets
- Generic secrets (high entropy strings)

**Custom checks**: `.env` file detection in commits

### 3. Dependency Scanning

**Tools**:
- `pnpm audit` (npm dependencies)
- GitHub Dependency Review (PR diffs)
- Trivy (comprehensive SCA)

**Frequency**: Every push and PR
**Fail threshold**: HIGH or CRITICAL severity
**SBOM**: Generated with CycloneDX format

**License compliance**: Blocks GPL-3.0 and AGPL-3.0 licenses

### 4. Container Security

**Tool**: Trivy
**Frequency**: Every push and PR
**Scope**: Filesystem, containers, IaC

**What it detects**:
- Vulnerable dependencies in containers
- Misconfigured infrastructure (IaC)
- Exposed secrets in container layers
- Non-compliance with best practices

### 5. DAST (Dynamic Application Security Testing)

**Tool**: OWASP ZAP
**Frequency**:
- Baseline scan: Every PR (if app changes detected)
- Full scan: Weekly (Sundays 2 AM UTC)
- API scan: On-demand

**What it detects**:
- SQL injection (runtime)
- XSS (runtime)
- CSRF vulnerabilities
- Security misconfiguration
- Broken authentication
- Sensitive data exposure

**Configuration**: `.zap/rules.tsv`
**Workflow**: `.github/workflows/zap-dast.yml`

### 6. Crypto Hygiene

**Tool**: Custom checker script
**Frequency**: Every push and PR

**Checks**:
- No hardcoded keys/secrets
- Only approved algorithms used
- Deprecated crypto functions flagged
- KMS infrastructure verified
- Key rotation policies documented

**Workflow**: `.security/crypto-hygiene-checker.cjs`

### 7. Security Gates

**Tool**: Custom gate checker
**Frequency**: Every push and PR

**Invariants checked**:
- Security documentation exists and is current
- Security headers configured
- Authentication middleware present
- Input validation libraries in use
- Security testing workflows active
- Container best practices followed
- GA compliance (if applicable)
- CODEOWNERS for security paths

**Workflow**: `.security/security-gates-checker.sh`

---

## 🔐 Cryptographic Standards

### Key Management

- **KMS Integration**: All encryption operations must use KMS
  - AWS KMS: `services/crypto/kms.ts`
  - HSM Support: `crypto/kms/hsm-adapter.ts`
  - Customer Managed Keys (CMK): Supported for enterprise deployments

- **Key Storage**:
  - ❌ Never hardcode keys in source code
  - ✅ Use environment variables: `process.env.KMS_KEY_ID`
  - ✅ Use secret management services (Vault, AWS Secrets Manager)

### Approved Algorithms

**Symmetric Encryption**:
```typescript
// ✅ GOOD
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// ❌ BAD - deprecated
const cipher = crypto.createCipher('aes-256-ecb', key);
```

**Hashing**:
```typescript
// ✅ GOOD
const hash = crypto.createHash('sha256');

// ❌ BAD - insecure
const hash = crypto.createHash('md5');
```

**Key Derivation**:
```typescript
// ✅ GOOD
crypto.pbkdf2(password, salt, 100000, 64, 'sha512', callback);

// ❌ BAD - insufficient iterations
crypto.pbkdf2(password, salt, 1000, 64, 'sha1', callback);
```

### Key Rotation

- **Policy**: All cryptographic keys are rotated on a 90-day schedule
- **Implementation**: `crypto/kms/hsm-adapter.ts` (rotateKey method)
- **Automation**: Scheduled via KMS provider
- **Documentation**: Key rotation events logged in audit trail

---

## 🔑 Secret Management

### DO ✅

1. **Use Environment Variables**:
   ```typescript
   const apiKey = process.env.API_KEY;
   const dbPassword = process.env.DATABASE_PASSWORD;
   ```

2. **Use Secret Management Services**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

3. **Use KMS for Encryption**:
   ```typescript
   import { encryptBlob } from 'services/crypto/kms';
   const encrypted = await encryptBlob(Buffer.from(plaintext));
   ```

4. **Rotate Secrets Regularly**:
   - Production secrets: Every 90 days
   - Development secrets: Every 180 days
   - Compromised secrets: Immediately

### DON'T ❌

1. **Hardcode Secrets**:
   ```typescript
   // ❌ NEVER DO THIS
   const apiKey = "sk_live_abc123...";
   const dbPassword = "MySecretPassword123";
   ```

2. **Commit .env Files**:
   - `.env` files are gitignored
   - Only commit `.env.example` templates

3. **Log Secrets**:
   ```typescript
   // ❌ BAD
   console.log(`API Key: ${apiKey}`);

   // ✅ GOOD
   console.log('API Key: [REDACTED]');
   ```

4. **Share Secrets in Plain Text**:
   - Use secure sharing tools (1Password, LastPass, etc.)
   - Never send secrets via Slack, email, or SMS

---

## 📦 Dependency Management

### Vulnerability Scanning

- **Frequency**: Every push, PR, and nightly
- **Tools**: pnpm audit, Trivy, GitHub Dependency Review
- **Threshold**: High and Critical vulnerabilities must be fixed

### Update Policy

- **Critical vulnerabilities**: Fix within 24 hours
- **High vulnerabilities**: Fix within 7 days
- **Medium vulnerabilities**: Fix within 30 days
- **Low vulnerabilities**: Fix in next maintenance window

### SBOM (Software Bill of Materials)

- **Format**: CycloneDX JSON
- **Generation**: Automated on every security scan
- **Location**: Workflow artifacts
- **Retention**: 30 days

### License Compliance

**Blocked licenses**:
- GPL-3.0
- AGPL-3.0

**Review required**:
- GPL-2.0
- LGPL-3.0

---

## 🎫 Security Exception Process

Sometimes a security finding needs to be temporarily accepted. Use the security allowlist.

### Adding an Exception

Edit `.security/allowlist.yaml`:

```yaml
exceptions:
  - id: CVE-2024-12345
    package: some-package@1.2.3
    severity: HIGH
    expires: 2025-12-31
    reason: 'No fix available; usage is sandboxed and not exploitable'
    approver: 'security@intelgraph.example'
    ticket: 'SEC-1234'
```

### Requirements

1. **Approval**: Must be approved by security team
2. **Expiration**: Must have expiration date (max 90 days)
3. **Justification**: Must document why exception is needed
4. **Tracking**: Must link to tracking ticket
5. **Review**: Exceptions reviewed monthly

### Automatic Checks

- Expired exceptions cause CI to fail
- Exceptions must be renewed or resolved before expiry

---

## ⏱️ Response Timeline

| Severity | Acknowledgment | Resolution Target | SLA |
|----------|---------------|-------------------|-----|
| **Critical** | 4 hours | 24 hours | 99% |
| **High** | 24 hours | 7 days | 95% |
| **Medium** | 48 hours | 30 days | 90% |
| **Low** | 5 days | Next release | 80% |

### Severity Definitions

**Critical**:
- Remote code execution
- Authentication bypass
- Data breach
- Privilege escalation

**High**:
- XSS with session theft
- SQL injection
- Sensitive data exposure
- Cryptographic failures

**Medium**:
- CSRF
- Open redirects
- Information disclosure
- Security misconfiguration

**Low**:
- Missing security headers
- Verbose error messages
- Clickjacking
- Cache control issues

---

## 🔗 Additional Resources

- **Security Workflows**: `.github/workflows/security-autopilot.yml`
- **Crypto Checker**: `.security/crypto-hygiene-checker.cjs`
- **Security Gates**: `.security/security-gates-checker.sh`
- **ZAP Config**: `.zap/rules.tsv`
- **Allowlist**: `.security/allowlist.yaml`

---

## 📞 Contact

- **Security Team**: security@intelgraph.example
- **Bug Bounty**: TBD
- **General Security Questions**: Create a GitHub Discussion

---

**Last Updated**: 2025-11-20
**Next Review**: 2025-05-20 (6 months)
