# Findings Register - External Security Review (Oct 2025)

| ID           | Severity     | Component                                          | Title                                                  | Status | Disposition     |
| ------------ | ------------ | -------------------------------------------------- | ------------------------------------------------------ | ------ | --------------- |
| SEC-2025-001 | **Critical** | Authentication (`server/src/app.ts`)               | **Insecure Default Authentication Strategy**           | Open   | **Fix Now**     |
| SEC-2025-002 | **High**     | Security Headers (`middleware/securityHeaders.ts`) | **Permissive Content Security Policy (unsafe-inline)** | Open   | **Risk Accept** |
| SEC-2025-003 | **High**     | Request Signing                                    | **HMAC Validation in Non-Blocking Legacy Mode**        | Open   | **Backlog**     |

## Detail: SEC-2025-001 (Insecure Default Authentication)

**Description:**
The application's `authenticateToken` middleware falls back to a "Development Mode" which automatically grants full Admin access (`dev-user`) if a token is missing. This logic is guarded only by `cfg.NODE_ENV !== 'production'`.

**Impact:**
If a staging or production environment is accidentally deployed with a misconfigured `NODE_ENV` (e.g. undefined, or 'prod' instead of 'production'), the system fails open, granting administrative access to unauthenticated attackers.

**Remediation:**
Change default behavior to "Fail Closed". Require an explicit affirmative signal (e.g., `ENABLE_INSECURE_DEV_AUTH=true`) to enable the bypass.

## Detail: SEC-2025-002 (Permissive CSP)

**Description:**
`script-src` and `style-src` allow `'unsafe-inline'`. This significantly reduces protection against XSS attacks.

**Impact:**
Attackers may be able to execute malicious scripts if they can inject HTML/JS.

**Disposition:**
Risk Accepted (Temporary). Frontend refactor required to remove inline styles/scripts.

## Detail: SEC-2025-003 (HMAC Legacy Mode)

**Description:**
HMAC request signing is implemented but set to "Legacy Mode" (non-blocking warning) to preserve backward compatibility.

**Disposition:**
Backlog. Scheduled for next hardening sprint.
