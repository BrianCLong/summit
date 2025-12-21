# Deprecated Targets Audit

## Inventory Sources
- docs/reference/deprecations.md
- CHANGELOG.md
- `@deprecated` code annotations (rg "@deprecated")

## Deprecated Targets

| Target | Source | Status | Migration / Notes |
| --- | --- | --- | --- |
| Legacy GraphQL Auth API | docs/reference/deprecations.md | Planned removal v25.0 | Move to OAuth2 with PKCE (see `docs/how-to/auth-migration.md`). |
| XML Configuration Format | docs/reference/deprecations.md | Removed v24.0 | Use YAML config and follow `docs/how-to/upgrade-to-v24.md#configuration-updates`. |
| REST API v1 Endpoints | docs/reference/deprecations.md | Planned removal v25.0 | Migrate to GraphQL API (`docs/how-to/api-v2-migration.md`). |
| Legacy Threat Feed Format | docs/reference/deprecations.md | Planned removal v26.0 | Adopt STIX 2.1 format (`docs/how-to/feed-format-migration.md`). |
| PostgreSQL 12 Support | docs/reference/deprecations.md | Planned removal v25.0 | Upgrade to PostgreSQL 14+ (`docs/how-to/postgres-upgrade.md`). |
| Redis 6.x Support | docs/reference/deprecations.md | Planned removal v25.0 | Upgrade to Redis 7 (`docs/how-to/redis-upgrade.md`). |
| Docker Compose v1 | docs/reference/deprecations.md | Removed v24.0 | Use Docker Compose v2 (`docs/how-to/docker-compose-v2.md`). |
| Legacy Report Engine | docs/reference/deprecations.md | Removed v24.0 | Rebuild reports with the new builder (`docs/how-to/report-builder-migration.md`). |
| SHA-1 Certificate Support | docs/reference/deprecations.md | Planned removal v25.0 | Rotate to SHA-256 certificates (`docs/security/certificate-upgrade.md`). |
| File-based User Management | docs/reference/deprecations.md | Planned removal v25.0 | Integrate LDAP/SAML (`docs/how-to/user-mgmt-migration.md`). |
| Legacy Server Feature Flag Stack (flags/store.ts, middleware/flagGate.ts, featureFlags/flagsmith.ts, services/FeatureFlagService.ts) | docs/reference/deprecations.md & code | **Removed v24.2** | Initialize feature flags with `initializeFeatureFlags()` / `getFeatureFlagService()` from `server/src/feature-flags/setup.ts`. |
| Telemetry shim (`server/src/lib/telemetry/comprehensive-telemetry.ts`) | @deprecated tag | Deprecated | Replace with modules in `server/src/lib/observability/` before removing consumers. |
| MUI Grid compatibility typings (`client/src/types/mui-compat.d.ts`) | @deprecated tag | Deprecated (upstream) | Migrate components to `Grid2` before the MUI v8 upgrade. |
| CHANGELOG husky initialization helpers | CHANGELOG.md | Deprecated tooling | Use current Husky v10 setup; deprecated warnings already resolved. |

## Verification
- `tsc --noEmit` to confirm removal leaves no runtime references.
- `rg` across the repository to ensure no lingering imports of removed modules.
- ESLint guardrails block reintroduction of removed feature-flag modules.
