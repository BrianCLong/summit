# Environment Contracts

This document defines the "Environment Contract" for the Summit platform. All environments (Local, CI, Staging, Production) must adhere to these specifications to ensure parity, reproducibility, and stability.

## Environment Definitions

| Environment | Purpose | Key Characteristics |
| :--- | :--- | :--- |
| **Local** | Development & Debugging | Ephemeral data, mocked external APIs (optional), hot-reloading. |
| **CI** | Validation & Testing | Fresh ephemeral data, mocked external APIs (required), strict validation. |
| **Staging** | Pre-Release Verification | Persistent test data, real external APIs (sandbox), production parity. |
| **Production** | Live Operations | Persistent production data, real external APIs, high availability. |

## External Dependencies

All environments require the following core services to be available.

| Service | Version | Local Port | CI Port | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Neo4j** | 5.25 | `7474` (HTTP), `7687` (Bolt) | `7474`, `7687` | Requires `apoc` plugin. Auth: `neo4j/test` (Local/CI). |
| **Redis** | 7-alpine | `6379` | `6379` | Used for caching and queues. |
| **Postgres** | 16-alpine | `5432` | `5432` | Relational data & audit logs. |
| **OIDC Provider**| - | Mocked / Auth0 | Mocked | OpenID Connect compatible provider. |

## Port Registry

To avoid port conflicts on local machines, we strictly enforce the following port assignments.

| Service | Port | Description |
| :--- | :--- | :--- |
| **Web Client** | `3000` | The main Summit web application (Report Studio). |
| **API Server** | `4000` | Main GraphQL API and Policy LAC. |
| **Provenance Ledger** | `4010` | Immutable ledger service. |
| **NL2Cypher** | `4020` | Natural Language to Cypher translation service. |
| **Graph Service** | `4030` | (Reserved) Future microservice. |

## Environment Variables

All environments must provide the environment variables defined in `.env.example`.

### Validation
Configuration is validated at startup using `zod`. The application **will not start** if:
1.  Required variables are missing (in strict mode).
2.  Variable types are incorrect (e.g., `PORT` is not a number).
3.  Security rules are violated (e.g., default passwords in `production`).

### Critical Variables
*   `NODE_ENV`: Must be one of `development`, `test`, `staging`, `production`.
*   `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Connection details for Graph DB.
*   `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Connection details for SQL DB.
*   `REDIS_HOST`, `REDIS_PORT`: Connection details for Redis.

## Drift Prevention

*   **Config Drift**: Validated via `server/src/config/schema.ts` at startup.
*   **Infra Drift**: Managed via `docker-compose.yml` (Local/CI) and Terraform (Staging/Prod - *future*).
