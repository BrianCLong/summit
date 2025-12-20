# RBAC enablement toggle

The conductor service enables Role-Based Access Control (RBAC) by default for all environments to preserve least-privilege enforcement.

## Disabling RBAC for local development or CI

- Set `RBAC_ENABLED=false` (accepted values: `false`, `0`, `no`) to bypass authentication and authorization middleware.
- When disabled, the middleware injects a minimal system user and allows all permission checks to proceed without blocking requests.
- Leave `RBAC_ENABLED` unset to keep RBAC enabled (secure-by-default).

> ⚠️ **Do not disable RBAC in production**. The toggle is intended only for local development, test fixtures, and CI smoke environments.

### Mock Maestro surface

The k6/CI mock Maestro surface starts with `RBAC_ENABLED=false` so smoke tests can run without authz requirements. To re-enable RBAC in that surface, explicitly set `RBAC_ENABLED=true` before launching `scripts/ci/mock-maestro-server.mjs`.
