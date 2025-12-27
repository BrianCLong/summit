# Configuration migrations

This directory tracks versioned mutations applied to `config/app.yaml`.

## Version history

- **v1**: Baseline application configuration (database/auth/services/feature toggles).
- **v2**: Adds hardened `security.secrets` defaults (provider preference, rotation, audit logging) and normalizes feature flag toggles so migrations can enforce minimum defaults.

## Operations playbook

1. Add a `{nextVersion}.js` file exporting `up` and `down` functions.
2. Ensure `up` sets `config.version` to the new version and leaves prior fields intact.
3. Keep `down` idempotent and able to roll back partial writes from failed runs.
4. Document every migration in this file with rationale and operational notes.
5. Commit the updated versioned example in `config/versioned/` so operators can diff expected layouts.
