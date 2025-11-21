# Security Policy

## Reporting Vulnerabilities

Report vulnerabilities via GitHub Security Advisories or by contacting the security team at `security@intelgraph.example`. We aim to acknowledge reports within 48 hours and resolve critical vulnerabilities within 7 days.

## Security Architecture

The Summit Monorepo (IntelGraph) employs a multi-layered security approach:

### Authentication & Authorization
- **Unified Authentication**: Supports both JWT (Bearer tokens) and API Keys (`X-API-Key`).
- **Middleware Chain**: All requests pass through a security chain defined in `server/src/middleware/securityChain.ts`.
- **Role-Based Access Control (RBAC)**: Enforced via JWT claims and dedicated middleware.
- **API Key Management**: API keys are supported for server-to-server communication, validated against a secure store (Environment variables or Secrets Manager).

### Network Security
- **CORS**: Strict Cross-Origin Resource Sharing policies are enforced, blocking unauthorized origins in production.
- **Rate Limiting**:
  - **Global Limit**: Protects the application from DDoS (default: 1000 req/15m).
  - **API Limit**: Stricter limits for API endpoints (default: 100 req/15m per IP).
- **Request Signing**: Sensitive operations (e.g., `/admin`, `/transfer`) require an `X-Signature` header for integrity verification.

### API Hardening
- **Versioning**: API responses include `X-API-Version` header.
- **Helmet**: Sets secure HTTP headers (HSTS, X-Frame-Options, etc.).
- **Audit Logging**: All authentication failures and sensitive operations are logged via `pino` and `auditLogger`.

### Development vs. Production
- **Production**: Enforces strict HTTPS, valid tokens, and secure headers.
- **Development**: May allow relaxed CORS for localhost development.

## Operational Security
- All secrets are rotated on a 90-day schedule.
- Dependencies are scanned for vulnerabilities.
- CI/CD pipelines include security checks.
