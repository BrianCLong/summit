# Summit Security Review Checklist for Contributors

**Version:** 1.0
**Target:** Summit Agentic AI OSINT Platform

## 1. Overview
This checklist is mandatory for all Pull Requests (PRs) that touch sensitive components (auth, cryptography, data access, or agents) or address security vulnerabilities in Summit.

## 2. General Security Checklist
*   [ ] **No Hardcoded Secrets**: Are there any API keys, JWT secrets, passwords, or private keys hardcoded in the code or comments?
*   [ ] **Secure Environment Config**: Are all secrets managed via environment variables and validated (e.g., using Zod)?
*   [ ] **Least Privilege**: Does this change grant more permissions than absolutely necessary?
*   [ ] **Fail Secure**: If an error occurs, does the system fail in a secure state (e.g., denying access rather than allowing it)?
*   [ ] **No Sensitive Data in Logs**: Have you ensured that PII, secrets, or raw request bodies are not being logged?

## 3. Application & API Checklist
*   [ ] **Input Validation (Zod)**: Are all incoming API request parameters validated against a strict Zod schema?
*   [ ] **Input Sanitization**: Is user input sanitized before being used in database queries, shell commands, or HTML rendering?
*   [ ] **Authorization Check**: Are role-based (RBAC) and multi-tenant (tenantId) checks performed for every request?
*   [ ] **GraphQL Security**: If this is a GraphQL PR, have you ensured query depth and complexity are within limits?
*   [ ] **Rate Limiting**: Have you considered whether this new endpoint needs rate limiting?

## 4. Agent & Orchestration Checklist
*   [ ] **LLM Guardrails**: Does LLM output pass through a safety/verification layer before being processed or returned?
*   [ ] **Budget Enforcement**: Does this change respect pre-defined token/compute budgets?
*   [ ] **Runaway Protection**: Are there mechanisms in place to prevent infinite agent loops or unintended repetitive actions?
*   [ ] **Provenance Tracking**: Does this action properly record its reasoning and evidence in the Provenance Ledger?

## 5. Vulnerability Remediation (If Applicable)
*   [ ] **Reproduction**: Have you added a test case that reproduces the vulnerability and fails without the fix?
*   [ ] **Completeness**: Does the fix address all variants and entry points for this vulnerability?
*   [ ] **Regression Testing**: Have you verified that existing security tests still pass?

## 6. Dependency Management
*   [ ] **Audit Check**: Does `pnpm audit` show any new critical vulnerabilities with these changes?
*   [ ] **Provenance Check**: Are all new dependencies from trusted sources and have they been reviewed for security?

## 7. Submission Checklist
*   [ ] **Verified**: I have run all relevant security tests and verified the fix/feature locally.
*   [ ] **Documented**: I have updated the relevant security documentation (if applicable).
*   [ ] **Self-Reviewed**: I have completed this checklist before requesting a peer review.

## 8. Related Documentation
*   [Contributor Cheatsheet](../CONTRIBUTOR_CHEATSHEET.md)
*   [PR Security Checklist](./PR_SECURITY_CHECKLIST.md)
*   [Security Guidelines](./SECURITY_GUIDELINES.md)
