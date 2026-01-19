# Security Vulnerability Triage Guide

This document provides procedures for triaging and documenting security vulnerabilities discovered by automated scanners.

---

## Table of Contents

- [Triage Process](#triage-process)
- [Dependency Vulnerabilities](#dependency-vulnerabilities)
- [Code Scanning Alerts](#code-scanning-alerts)
- [Suppression Guidelines](#suppression-guidelines)
- [Documentation Requirements](#documentation-requirements)

---

## Triage Process

### 1. Assessment

For each vulnerability, determine:

- **Exploitability**: Can it be exploited in our context?
- **Impact**: What's the worst-case outcome?
- **Exposure**: Is the vulnerable code path reachable in production?
- **Mitigation**: Are there compensating controls?

### 2. Prioritization

Use this decision tree:

```
┌─────────────────────────────┐
│ Is it Critical or High?     │
├─────────────────────────────┤
│ YES → P0 (fix within 72h)   │
│ NO  → Continue...            │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Is vulnerable path reachable│
│ in production?              │
├─────────────────────────────┤
│ YES → P1 (fix within 1 week)│
│ NO  → P2 (fix within 30 days)│
└─────────────────────────────┘
```

### 3. Action

Choose one:

- **Fix**: Upgrade dependency or patch code
- **Mitigate**: Add compensating controls
- **Document**: If unfixable short-term, document risk acceptance
- **Suppress**: If false positive, suppress with justification

---

## Dependency Vulnerabilities

### Upgrading Dependencies

1. **Check breaking changes**:

   ```bash
   # View changelog
   npm view <package> versions
   npm view <package>@<version> --json
   ```

2. **Test locally**:

   ```bash
   pnpm add <package>@<version>
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

3. **Update lockfile**:
   ```bash
   pnpm install --frozen-lockfile=false
   ```

### When Upgrade Is Not Possible

If immediate upgrade is blocked (e.g., major breaking changes):

1. **Document the CVE**:

   Create `docs/security/CVE-YYYY-NNNNN-MITIGATION.md`:

   ```markdown
   # CVE-YYYY-NNNNN Mitigation Plan

   ## Vulnerability Details

   - **Package**: <package-name>
   - **Severity**: <Critical|High|Medium|Low>
   - **CVE ID**: CVE-YYYY-NNNNN
   - **CVSS Score**: X.X
   - **Description**: [Brief description]

   ## Impact Assessment

   - **Exploitability**: [How can this be exploited?]
   - **Exposure**: [Is the vulnerable code path reachable?]
   - **Impact**: [What's the worst-case scenario?]

   ## Current Mitigations

   - [Mitigation 1: e.g., Input validation]
   - [Mitigation 2: e.g., Rate limiting]
   - [Mitigation 3: e.g., Network isolation]

   ## Remediation Plan

   - **Target Date**: YYYY-MM-DD
   - **Strategy**: [e.g., Migrate to <alternative> in Q1 2026]
   - **Blockers**: [What's preventing immediate fix?]
   - **Owner**: @username

   ## References

   - [CVE Database](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-YYYY-NNNNN)
   - [GitHub Advisory](https://github.com/advisories/GHSA-xxxx-xxxx-xxxx)
   ```

2. **Add to audit ignore list** (package.json):

   ```json
   {
     "pnpm": {
       "auditConfig": {
         "ignoreCves": ["CVE-YYYY-NNNNN"]
       }
     }
   }
   ```

3. **Update SECURITY.md**:
   Add row to "Known Security Limitations" table with link to mitigation doc.

### Rollback Plan

If upgrade causes production issues:

```bash
# Revert the dependency change
git revert <commit-sha>

# Or manually rollback
pnpm add <package>@<previous-version>
pnpm install --frozen-lockfile=false

# Deploy previous version
./scripts/deploy.sh rollback
```

---

## Code Scanning Alerts

### True Positives

If the alert is valid:

1. **Fix the vulnerability**:
   - For injection: Use parameterized queries, input validation
   - For XSS: Use proper output encoding, CSP headers
   - For auth bypass: Add proper authorization checks
   - For secrets: Remove from code, use environment variables

2. **Add security test**:

   ```javascript
   describe("Security: [Vulnerability Type]", () => {
     it("should prevent [attack vector]", async () => {
       const maliciousInput = "<script>alert('xss')</script>";
       const result = await processInput(maliciousInput);
       expect(result).not.toContain("<script>");
     });
   });
   ```

3. **Document fix in commit message**:
   ```
   fix(security): prevent XSS in user profile display
   Fixes: CodeQL alert #1234 (js/xss)
   Impact: High - user-controlled input was rendered without sanitization
   Test: Added security regression test in user.test.ts:42
   ```

### False Positives

If the alert is incorrect:

1. **Verify it's genuinely false**:
   - Review the data flow analysis
   - Confirm the vulnerable path is unreachable
   - Check if framework provides built-in protection

2. **Suppress narrowly**:

   **Prefer**: Per-line suppression with justification

   ```javascript
   // eslint-disable-next-line security/detect-sql-injection -- Safe: query uses parameterized placeholder
   const result = await db.query(SAFE_QUERY, [userInput]);
   ```

   **Avoid**: File-level or broad suppressions

   ```javascript
   /* eslint-disable security/detect-sql-injection */ // Too broad!
   ```

3. **Document the suppression**:
   - **Why it's safe**: Explain why the code is not vulnerable
   - **What protects it**: Framework guarantees, input validation, etc.
   - **Evidence**: Link to documentation proving safety

---

## Suppression Guidelines

### CodeQL Suppressions

Use `// lgtm[js/sql-injection]` comments:

```javascript
// lgtm[js/sql-injection]: Query uses Sequelize parameterized statements
const users = await User.findAll({ where: { id: userId } });
```

### Semgrep Suppressions

Use `// nosemgrep` with rule ID:

```javascript
// nosemgrep: javascript.express.security.audit.xss.mustache.explicit-unescape
// Safe: output is HTML-encoded by React before rendering
const htmlContent = dangerouslySetInnerHTML({ __html: sanitized });
```

### ESLint Security Suppressions

```javascript
// eslint-disable-next-line security/detect-non-literal-regexp
// Safe: regexInput is validated against allowlist in validatePattern()
const regex = new RegExp(regexInput);
```

---

## Documentation Requirements

### For Each Suppression

- [ ] Comment explaining why it's safe
- [ ] Reference to protective mechanism (validation, framework, etc.)
- [ ] Link to evidence (docs, tests, specs)
- [ ] Narrow scope (per-line, not file-wide)

### For Each Risk Acceptance

- [ ] CVE mitigation document created
- [ ] Added to SECURITY.md Known Security Limitations table
- [ ] Reviewed and approved by security team
- [ ] Expiration date set for review
- [ ] Alternative solutions documented

### For Each Fix

- [ ] Security test added proving fix works
- [ ] No regressions in existing tests
- [ ] Commit message explains impact and fix
- [ ] Security Impact note in PR description

---

## Examples

### Example 1: Fixing SQL Injection

**Alert**: CodeQL js/sql-injection
**File**: `server/src/api/users.ts:42`

**Before**:

```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
const result = await db.raw(query);
```

**After**:

```javascript
const query = "SELECT * FROM users WHERE id = ?";
const result = await db.raw(query, [userId]);
```

**Test**:

```javascript
it("should prevent SQL injection in user lookup", async () => {
  const maliciousId = "1 OR 1=1";
  await expect(getUser(maliciousId)).rejects.toThrow("Invalid user ID");
});
```

### Example 2: Suppressing False Positive

**Alert**: Semgrep javascript.lang.security.audit.path-traversal
**File**: `server/src/storage/files.ts:128`

**Code**:

```javascript
// nosemgrep: javascript.lang.security.audit.path-traversal
// Safe: filePath is validated in sanitizeFilePath() which restricts to allowlisted directories
// Evidence: Test coverage in files.test.ts:56-78 proves only safe paths are accepted
const absolutePath = path.join(UPLOAD_DIR, filePath);
```

**Supporting test**:

```javascript
describe("sanitizeFilePath", () => {
  it("should reject path traversal attempts", () => {
    expect(() => sanitizeFilePath("../../../etc/passwd")).toThrow("Invalid path");
  });
});
```

### Example 3: Risk Acceptance

**Alert**: Dependabot CVE-2022-24434 (dicer via apollo-server-express)

**Mitigation Document**: `docs/security/CVE-2022-24434-MITIGATION.md`

**Mitigations Applied**:

- Request size limits (10MB max)
- Rate limiting (100 req/min per IP)
- Monitoring for exploit patterns

**Remediation Plan**: Migrate to Apollo Server v4 in Q1 2026 (requires GraphQL schema refactoring)

---

## Tools

### Useful Commands

```bash
# List all Dependabot alerts
gh api repos/BrianCLong/summit/dependabot/alerts

# List all code scanning alerts
gh api repos/BrianCLong/summit/code-scanning/alerts

# Run local security audit
pnpm audit --audit-level=moderate

# Run local SAST scan
npx semgrep --config=auto .

# Check for secrets
pnpm run security:check
```

### Scripts

- `scripts/security/baseline-check.sh` - Verify security posture
- `scripts/security/scanner-delta.sh` - Compare before/after scanner results
- `scripts/security/trivy-scan.sh` - Scan containers for vulnerabilities

---

## Questions?

Contact: [@security-team](https://github.com/orgs/BrianCLong/teams/security-team)
