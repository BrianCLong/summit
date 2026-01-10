# Logging Safety Rules

These rules define the boundaries for logging within the Summit application ecosystem to prevent the accidental exposure of sensitive information (PII, credentials, secrets, tokens).

## 1. Absolute Prohibitions

The following must **NEVER** be logged to stdout/stderr or any persistence layer:

*   **Secrets / Credentials**: Passwords, API keys, private keys, bearer tokens, or any field named `password`, `secret`, `token`, `credential`, `key` (heuristic match).
*   **Whole `process.env`**: Dumping the entire environment is strictly forbidden.
*   **PII**: Personally Identifiable Information (email, phone, address) unless properly masked or hashed.
*   **Session Data**: Full session cookies, JWT payloads (unless claims are non-sensitive), or raw `Set-Cookie` headers.

## 2. Allowed Logging

*   **Structured Logging**: Prefer JSON structured logs (via Pino/Winston).
*   **Error Codes**: Log error codes and generic messages rather than raw exception dumps if they might contain sensitive data.
*   **Trace IDs**: Always include Trace IDs/Request IDs for correlation.
*   **Redacted Data**: If you must log an object that contains sensitive fields, you **must** use a redaction utility.

## 3. Enforcement

This policy is enforced via:

1.  **CI Guardrail**: `scripts/ci/check_logging_safety.mjs` runs on every PR.
2.  **Code Review**: Human reviewers must verify logging changes.
3.  **Static Analysis**: `gitleaks` (for static secrets) and the CI guardrail (for runtime logging patterns).

## 4. Remediation

If the guardrail fails:

1.  **Remove the log**: If it's debug noise, delete it.
2.  **Redact**: If the log is needed, mask the sensitive part (e.g., `token: '***'`).
3.  **Suppress (Last Resort)**: If it is a false positive (e.g., logging a public key explicitly marked as safe), use `// no-log-check` on the line.

## 5. Violation Examples

❌ **Bad:**
```javascript
console.log('User logged in with token:', accessToken);
console.log('Env config:', process.env);
logger.info(`Failed login for password: ${password}`);
```

✅ **Good:**
```javascript
console.log('User logged in with token:', '***'); // Redacted
logger.info('User logged in', { userId: user.id }); // Context only
```
