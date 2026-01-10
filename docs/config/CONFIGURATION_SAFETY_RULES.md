# Configuration Safety Rules

## 1. Immutable Defaults
The following configuration defaults are **frozen** for the GA release. Code changes to these defaults constitute a **Breaking Change**.

*   **MVP1 Feature Flags**: All `mvp1.*` flags MUST default to `true`.
*   **Security Defaults**: `REQUIRE_REAL_DBS` MUST default to `false` (fail-safe for dev) but MUST be set to `true` in Production.

## 2. Runtime Changes
*   **Restart Required**: All `server/src/config/schema.ts` configurations (Port, DB Creds, JWT Secrets) require a server restart to take effect.
*   **Dynamic Flags**: Changes to `FEATURE_*` environment variables require a restart.
*   **JSON Flags**: Changes to `config/feature-flags.json` (if used via `FeatureFlagService`) *may* be picked up without restart depending on the provider (LaunchDarkly vs Local), but for GA Local file mode, a restart is assumed safe practice.

## 3. Environment Segregation
*   **Production**:
    *   `NODE_ENV=production`
    *   `REQUIRE_REAL_DBS=true`
    *   `CONFIG_VALIDATE_ON_START=true`
    *   Strong Passwords (non-default)
*   **Development**:
    *   `NODE_ENV=development`
    *   `REQUIRE_REAL_DBS=false`
    *   `CONFIG_VALIDATE_ON_START=false` (optional)

## 4. Breaking Changes
A configuration change is **breaking** if:
1.  It renames an existing Environment Variable.
2.  It changes the default behavior of a `mvp1.*` feature flag to `false`.
3.  It removes a supported configuration key without a deprecation cycle.
4.  It introduces a new required configuration without a fallback.

## 5. Verification
Run `npx tsx scripts/config/verify_ga_defaults.ts` to verify compliance with these rules.
