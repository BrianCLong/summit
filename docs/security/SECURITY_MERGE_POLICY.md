# Security Merge Policy

**Effective Date:** 2026-01-15
**Status:** DRAFT (Merge-Blocking)

## 1. Objective

To prevent the introduction of known critical and high-severity vulnerabilities into the `main` branch by establishing deterministic, automated merge gates.

## 2. Policy thresholds

| Severity     | Block Merge? | Max SLA (Days) | Action Required                   |
| ------------ | ------------ | -------------- | --------------------------------- |
| **Critical** | **YES**      | 0              | Immediate remediation or rollback |
| **High**     | **YES**      | 2              | Remediation required for merge    |
| **Medium**   | No           | 14             | Ticketed and scheduled            |
| **Low**      | No           | 30             | Ticketed if actionable            |

## 3. Authoritative Scanners

The following scanners feed into the blocking decision:

1. **CodeQL** (SAST) - GitHub Advanced Security
2. **Dependabot** (SCA) - Dependency vulnerabilities
3. **NPM Audit / Pip Safety** - Supply chain checks
4. **SonarCloud** - Code usage/quality patterns

## 4. Exception Process

If a false positive is identified or business criticality overrides security risk:

1. Create a **Security Exception Issue** in Jira/GitHub.
2. Label with `security-exception`.
3. Required Evidence:
   - Proof of false positive (e.g., unreachable code path).
   - Or: Compensating control description (e.g., WAF rule).
   - Or: Risk acceptance by VP Engineering (for Critical).
4. **Approval**: Must be approved by 1 Security Engineer AND 1 Engineering Lead.
5. **Expiration**: Exemptions expire automatically after 30 days.

## 5. Enforcement

Enforcement is handled via the `security-policy-check` CI status check. This check will fail if unmanaged Critical/High alerts exist without valid sub-tasks/exceptions.
