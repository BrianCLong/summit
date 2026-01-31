# Runbook: Startup and Configuration

This runbook describes how to safely start the Summit Platform and validate its configuration.

## 1. Startup Sequence

The platform uses a dependency-aware startup sequence:
1. **Secrets Bootstrap**: `bootstrapSecrets()` loads keys from Vault or Environment.
2. **Configuration Validation**: `cfg` Proxy validates environment variables against Zod schema.
3. **Database Connectivity**: Initializes Neo4j, PostgreSQL, and Redis.
4. **Service Initialization**: Starts internal singleton services (Audit, Guardrails, etc.).
5. **HTTP Server**: Starts Express listener on the configured port.

### Commands
```bash
# Standard startup
npm start

# Development with hot-reload
npm run dev
```

## 2. Configuration Validation

Configuration is validated at startup. If any required variable is missing or invalid, the process will exit with a detailed error message.

### Core Variables
| Variable | Description | Requirement |
|----------|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEO4J_URI` | Neo4j Bolt URI | Required |
| `JWT_SECRET` | Secret for signing tokens | Min 32 chars |
| `NODE_ENV` | Environment mode | `production` or `development` |

### Validating locally
```bash
# Check if current env is valid without starting the server
npm run config:validate

# Run core health probes (Standalone Mode)
# Useful for verifying the binary before dependencies are UP
SMOKE_MODE=standalone npm run test:smoke

# Run end-to-end health probes (Full Mode - Default)
# Requires PostgreSQL, Neo4j, and Redis to be reachable
npm run test:smoke
```

### Smoke prerequisites + modes
- **Preflight**: `/health` must exist and be reachable; a 404 indicates a route mismatch.
- **Standalone** (`SMOKE_MODE=standalone`): only core endpoints (`/health`, `/health/live`, `/healthz`) and should pass with minimal startup.
- **Full** (`SMOKE_MODE=full`, default): includes readiness/metrics/docs and requires PostgreSQL, Neo4j, and Redis.

## 3. Environment Specifics

### Production Mode
When `NODE_ENV=production` is set, the following additional invariants are checked:
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be unique and >= 32 chars.
- `CORS_ORIGIN` must use explicit HTTPS URLs (no `*`).
- Critical database URLs must not contain `localhost` or `127.0.0.1`.

### GA Cloud Guard
If `GA_CLOUD=true` is enabled:
- `AWS_REGION` is mandatory.
- Strict cloud-native constraints are enforced on service discovery.

## 4. Troubleshooting Startup Failures

### "Environment Validation Failed"
**Cause**: Missing or malformed environment variables.
**Action**: Check the error output for specific missing keys. Refer to `.env.example` for the correct format.

### "PostgreSQL pool not initialized"
**Cause**: Attempting to access the DB before `connectPostgres()` completes.
**Action**: This is usually handled by lazy initialization, but check `server.log` for earlier DB connection errors.

### "Unknown file extension .tson"
**Cause**: Legacy `.tson` files being imported.
**Action**: Ensure all schema imports point to `.json`. Run `find . -name "*.tson"` to find lingering files.
