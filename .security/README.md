# Security Tooling

This directory contains security automation scripts and configuration for the Summit repository.

## 📁 Contents

### `crypto-hygiene-checker.cjs`
Validates cryptographic hygiene across the codebase.

**Usage**:
```bash
node .security/crypto-hygiene-checker.cjs
```

**Checks**:
- No hardcoded secrets or cryptographic keys
- Only approved algorithms (FIPS 140-2 compliant)
- Deprecated crypto functions flagged
- KMS infrastructure verification
- Key rotation policy documentation

**Exit codes**:
- `0`: All checks passed
- `1`: Critical issues found (blocks CI)

### `security-gates-checker.sh`
Enforces high-level security invariants.

**Usage**:
```bash
./.security/security-gates-checker.sh
```

**Checks**:
- Security documentation currency
- No secrets in code
- Security headers configuration
- Dependency vulnerabilities
- Crypto configuration
- Authentication/authorization measures
- Input validation
- Container security
- GA compliance
- CODEOWNERS for security paths

**Exit codes**:
- `0`: All gates passed
- `1`: Critical gate failed
- `2`: Warning gate failed (non-blocking)

### `allowlist.yaml`
Security exception management.

**Format**:
```yaml
exceptions:
  - id: CVE-YYYY-XXXXX
    package: package-name@version
    severity: HIGH
    expires: YYYY-MM-DD
    reason: 'Detailed justification'
    approver: 'security@example.com'
    ticket: 'TICKET-ID'
```

**Requirements**:
- Must have expiration date (max 90 days)
- Must be approved by security team
- Must link to tracking ticket
- Automatically validated in CI

## 🚀 Running Locally

### Quick Security Check
```bash
# Run all security checks
./.security/security-gates-checker.sh && \
node .security/crypto-hygiene-checker.cjs
```

### Individual Checks
```bash
# Crypto hygiene only
node .security/crypto-hygiene-checker.cjs

# Security gates only
./.security/security-gates-checker.sh

# Secret detection
gitleaks detect --source=. --no-banner --redact

# Dependency scan
pnpm audit --audit-level=high
```

## 🔧 CI Integration

These tools are automatically run by:
- `.github/workflows/security-autopilot.yml`
- `.github/workflows/zap-dast.yml`

Every push and PR triggers:
1. CodeQL SAST
2. Secret detection (Gitleaks)
3. Dependency scanning (pnpm audit, Trivy)
4. Crypto hygiene check
5. Security gates validation
6. ZAP DAST (on PRs with app changes)

## 📋 Adding New Security Checks

### Crypto Hygiene
Edit `crypto-hygiene-checker.js`:
1. Add algorithm to `APPROVED_ALGORITHMS` or `DEPRECATED_ALGORITHMS`
2. Add pattern to `patterns` array in `checkHardcodedSecrets()`
3. Add custom check function if needed

### Security Gates
Edit `security-gates-checker.sh`:
1. Create new `check_*` function
2. Add to `main()` function
3. Use `log_pass`, `log_fail`, or `log_warn` for results

## 🎫 Exception Management

### Adding Exception
1. Edit `.security/allowlist.yaml`
2. Get security team approval
3. Set expiration date (max 90 days)
4. Link to tracking ticket
5. Commit and create PR

### Renewing Exception
1. Update expiration date
2. Add renewal justification
3. Get renewed approval

### Removing Exception
1. Delete exception from `allowlist.yaml`
2. Verify fix is in place
3. Commit and verify CI passes

## 📊 Metrics

Security checks run on every commit:
- **SAST**: ~2-5 minutes
- **Secret Detection**: ~30 seconds
- **Dependency Scan**: ~1-2 minutes
- **Crypto Hygiene**: ~30 seconds
- **Security Gates**: ~30 seconds
- **ZAP DAST**: ~5-15 minutes (PRs only)

## 🔗 Related Documentation

- [SECURITY.md](../SECURITY.md) - Security policy and procedures
- [Security Autopilot Workflow](../.github/workflows/security-autopilot.yml)
- [ZAP DAST Workflow](../.github/workflows/zap-dast.yml)

## 🆘 Troubleshooting

### False Positives

**Crypto Hygiene**:
- Add exclusion to `excludeDirs` in `crypto-hygiene-checker.js`
- Ensure test files use `process.env` references

**Security Gates**:
- Review warning messages (non-blocking)
- Add exception to allowlist if justified

### CI Failures

1. Review workflow logs in GitHub Actions
2. Run checks locally to reproduce
3. Fix issues or add exceptions
4. Re-run CI

### Support

- Security questions: security@intelgraph.example
- Tool issues: Create GitHub issue with label `security`
