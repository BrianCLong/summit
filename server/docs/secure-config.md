# Secure configuration and secrets management

This service now centralizes configuration handling with environment-aware overlays, audited secret resolution, and feature flag governance.

## How configuration is loaded
- Base configuration: `server/config/app.yaml`.
- Optional environment overlays: inline under the `environments` key or file-based overrides in `server/config/environments/<env>.yaml` (uses `APP_ENV` or `NODE_ENV`).
- Migrations run from `server/config/migrations` with history in `.migration_history.json`.
- Validation uses JSON Schema files in `server/config/schemas` and resolves secrets before schema checks.

## Secret resolution
- Supported references:
  - `vault://path#field?default=...&optional=true&ttl=300`
  - `aws-sm://secret-name#jsonKey?default=...`
  - `env://ENV_VAR?default=...`
  - `file://relative/or/absolute/path#jsonKey?default=...&optional=true` (relative to `security.secrets.fileBasePath`)
  - `enc::v1:<iv>:<tag>:<ciphertext>` (AES-256-GCM; key from `CONFIG_ENCRYPTION_KEY` by default)
- Provider preference, cache TTLs, rotation interval, audit log path, and encryption key env are configured under `security.secrets`.
- File providers resolve relative paths from `security.secrets.fileBasePath` (defaults to repo root).
- Vault and AWS secrets are resolved from JSON fixtures (`server/config/vault.secrets.json`, `server/config/aws.secrets.json`) or env fallbacks (`VAULT_SECRET__PATH__FIELD`, `AWS_SECRET__NAME__FIELD`).
- For offline/fixture testing you can point `security.secrets.vault.address` or `security.secrets.aws.endpoint` to `file://<path>`.
- Every secret access is recorded to `logs/config-audit.log` without emitting secret values.

## Feature flags
- Feature flags live under `features.flags` and can include environment overrides and rollout percentages.
- Use `getFeatureFlags()` to check `isEnabled(flag, { userId, tenantId })` for deterministic rollouts.

## Rotation and encryption
- Secrets are cached for `cacheTtlSeconds` and refreshed on interval if `rotation.enabled` is true.
- Use `SecretManager.encrypt(plaintext, key)` to author encrypted-at-rest values; decrypts automatically when encountered.
