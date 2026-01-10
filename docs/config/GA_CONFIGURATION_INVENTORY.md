# GA Configuration Inventory

## 1. Core Application Configuration
Defined in `server/src/config/schema.ts`. Validated at startup.

| Key | Type | Default | GA Requirement | Description |
|-----|------|---------|----------------|-------------|
| `NODE_ENV` | Env | `development` | `production` | Runtime environment mode. |
| `PORT` | Env | `4000` | Defined by Infra | HTTP port for the API server. |
| `REQUIRE_REAL_DBS`| Env | `false` | `true` | Enforces use of real databases (rejects dev mocks). |
| `CONFIG_VALIDATE_ON_START` | Env | `undefined` | `true` | Enforces strict startup validation. |
| `NEO4J_*` | Env | (dev defaults)| Real Creds | Connection details for Graph DB. |
| `POSTGRES_*` | Env | (dev defaults)| Real Creds | Connection details for Relational DB. |
| `REDIS_*` | Env | (dev defaults)| Real Creds | Connection details for Cache/Queue. |
| `JWT_SECRET` | Env | (dev default) | **Secret** | Signing key for auth tokens. |
| `CORS_ORIGIN` | Env | `localhost` | Domain URL | Allowed CORS origin. |

## 2. Feature Flags (Runtime)
Defined in `server/src/config/featureFlags.ts`.

### Application Features (Toggleable via Env)
These features are controlled by `FEATURE_*` environment variables but MUST be enabled for GA.

| Flag Key | Env Variable | GA State | Description |
|----------|--------------|----------|-------------|
| `ai.enabled` | `FEATURE_AI_ENABLED` | `true` | Enables AI request processing. |
| `audit.trail` | `FEATURE_AUDIT_TRAIL` | `true` | Enables compliance audit logging. |
| `rbac.fineGrained` | `FEATURE_RBAC_FINE_GRAINED` | `true` | Enables fine-grained permission checks. |
| `opentelemetry.enabled` | `FEATURE_OPENTELEMETRY_ENABLED` | `true` | Enables observability. |
| `copilot.service` | `FEATURE_COPILOT_SERVICE` | `true` | Enables AI Copilot. |
| `analytics.panel` | `FEATURE_ANALYTICS_PANEL` | `true` | Enables Analytics UI. |
| `pdf.export` | `FEATURE_PDF_EXPORT` | `true` | Enables PDF/CSV export functionality. |
| `narrative.simulation` | `FEATURE_NARRATIVE_SIMULATION` | `true` | Enables Narrative Engine. |

### MVP1 Continuity Flags (Internal/Frozen)
These are hardcoded internal signals (`mvp1.*`) that default to `true` to guarantee backward compatibility and MVP scope. They are not typically toggled via Env.

*   `mvp1.authentication`
*   `mvp1.authorizationRbac`
*   `mvp1.tenancyIsolation`
*   `mvp1.auditLogging`
*   `mvp1.dataIngestion`
*   `mvp1.graphExploration`
*   `mvp1.searchElastic`
*   `mvp1.comments`
*   `mvp1.notifications`
*   `mvp1.workspaces`
*   `mvp1.csvExports`

### Agents (GA-Frozen: ENABLED)
| Flag Key | Env Variable | GA State |
|----------|--------------|----------|
| `agent.memory` | - | `true` |
| `agent.toolUse` | - | `true` |
| `agent.planning` | - | `true` |

### Experimental / Disabled for GA
| Flag Key | Env Variable | GA State |
|----------|--------------|----------|
| `agent.multiSwarm` | - | `false` |
| `agent.autonomousDeployment`| - | `false` |

## 3. Dynamic Feature Flags (Extension)
Defined in `config/feature-flags.json`. Loaded by `FeatureFlagService.ts`.
*Status: Secondary/Extension system. Not critical for MVP boot.*

## 4. Internal/Dev-Only Configuration
*   `DISABLE_SWAGGER`: Controls API documentation visibility.
*   `NO_NETWORK_LISTEN`: Used for testing.
