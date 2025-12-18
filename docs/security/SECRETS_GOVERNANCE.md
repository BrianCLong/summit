# Secrets Governance & Management

## Overview

This document outlines the governance, storage, access control, and lifecycle management of secrets within the Summit / IntelGraph platform. It enforces strict separation of concerns, auditability, and defense-in-depth strategies.

## Principles

1.  **No Secrets in Code**: Secrets must never be committed to version control.
2.  **Least Privilege**: Access to secrets is granted only to services and users that strictly require them.
3.  **Auditability**: All access to secrets (especially manual "break-glass" access) must be logged.
4.  **Rotation**: Secrets must be rotatable without downtime.

## Storage Locations

| Environment | Storage Mechanism | Access Method |
|-------------|-------------------|---------------|
| Development | `.env` (git-ignored) | `process.env` / `config` |
| CI/CD | GitHub Secrets | Env Vars Injection |
| Production | AWS Secrets Manager / Vault (Planned) | Runtime Injection / Sidecar |

## Break-Glass Protocol

In emergency situations where direct access to a secret is required by an administrator:

1.  Access is performed via the `SecretManager` interface or CLI tool.
2.  The action is logged with `SECURITY ALERT` severity.
3.  The event includes: Actor, Timestamp, IP Address, Reason, and the specific Secret ID.
4.  Alerts are dispatched to the security team immediately.

## Secret Rotation Policy

*   **JWT Secrets**: Rotated every 90 days. The system supports a "previous" key to allow for zero-downtime rotation.
*   **Database Credentials**: Rotated every 90 days.
*   **API Keys**: Rotated on suspicion of compromise or annually.

## Development Guidelines

### Accessing Secrets in Code

Do NOT use `process.env.MY_SECRET` directly. Instead:

1.  Define it in `server/src/config/secrets.ts` (schema validation).
2.  Access via `config` object (which logs sensitive access in debug).
3.  For critical operations, use `SecretManager.getSecret()`.

```typescript
// BAD
const key = process.env.OPENAI_API_KEY;

// GOOD
import config from '../config';
const key = config.openai.apiKey; // Logged/Audited
```

### Logging

The application logger (`pino`) is configured to **redact** known sensitive keys automatically.

*   Do not log raw objects that might contain secrets unless necessary (use specific fields).
*   If you add a new sensitive key, update `server/src/config/logger.ts` to include it in the redaction list.

## Pre-Commit Checks

A pre-commit hook runs `scripts/security/detect_secrets.ts` to scan for high-entropy strings and regex patterns matching common keys (AWS, Private Keys, etc.).
