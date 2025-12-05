# Security Operations Runbook

## Secret Management

The platform uses a `SecretManager` abstraction to handle sensitive configuration. This supports switching between Environment Variables (Development) and HashiCorp Vault (Production).

### Configuration

The secret provider is configured via environment variables:

- `SECRET_PROVIDER`: `vault` or `env` (default: `env`)
- `VAULT_ADDR`: URL of the Vault server (e.g., `https://vault.internal:8200`)
- `VAULT_TOKEN`: Auth token for Vault (for the service account)

### Adding a New Secret

1. **Development**: Add to `.env`.
2. **Production**:
   - Add to Vault at the appropriate path.
   - Ensure the service account has read access.
   - `SecretManager.getSecret('MY_SECRET')` will automatically fetch it.

### Secret Rotation

Secrets should be rotated every 90 days. The `SecretManager` supports automated rotation interfaces, but the actual rotation logic depends on the backing service (Vault).

To trigger a rotation (Administrative action):

```typescript
// Programmatic rotation
await SecretManager.getInstance().rotateSecret('DATABASE_URL');
```

This will:
1. Generate a new secret (via Vault).
2. Update the application state (if possible).
3. Log the rotation to `audit_logs`.

### Emergency Rotation

If a secret is compromised:
1. Revoke the secret immediately in Vault/AWS.
2. Generate a new secret.
3. Restart the service to flush any in-memory caches (if `SecretManager` caching is aggressive).
4. Run `scripts/security/scan_secrets.py` to ensure the leaked secret isn't in the codebase.

## Secret Scanning

A pre-commit hook (`scripts/scan_secrets.py`) scans all staged files for high-entropy strings and known patterns (AWS keys, Private Keys).

To run manually:
```bash
python3 scripts/scan_secrets.py --all
```

## Audit Logging

All secret access is logged to the `audit_logs` table with `action: ACCESS_SECRET`.
Rotation events are logged as `ROTATE_SECRET`.

## HTTPS & TLS

The server enforces TLS 1.3 when `SSL_KEY_PATH` and `SSL_CERT_PATH` are provided.
If these are missing, it falls back to HTTP (warns in logs).

## Security Headers

The following headers are enforced via `helmet`:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
