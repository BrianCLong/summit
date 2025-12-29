# Summit CLI Doctor

The `summit doctor` command validates local environment readiness for running the CLI without making any external network calls.

## What it checks

- **Environment & config**: Verifies required values (`SUMMIT_API_URL`, `SUMMIT_API_KEY`, `SUMMIT_TENANT_ID`) are present via environment variables or saved CLI config.
- **Connectivity (simulated)**: Ensures the configured API URL is well-formed so requests can be constructed.
- **Schema assets**: Confirms core schema files exist locally (`schema/baseline.graphql`, `schema/placement.graphql`, `schema/prov-ledger.graphql`).

## Usage

```bash
# Default run
summit doctor

# Override the schema directory (if running outside repo root)
summit doctor --schema-dir /path/to/schema

# Machine-readable output
summit doctor --json
```

## Exit codes

- `0`: All critical checks passed.
- `1`: At least one critical check failed (missing env/config, malformed URL, or missing schema file).

## Example output

```
Summit CLI Doctor

PASS API base URL (SUMMIT_API_URL): Resolved from environment.
PASS API key or token (SUMMIT_API_KEY): Resolved from environment.
PASS Tenant ID (SUMMIT_TENANT_ID): Resolved from environment.
PASS API connectivity (simulated): Validated API URL format: https://api.summit.local
PASS Schema file baseline.graphql: /workspace/summit/schema/baseline.graphql
PASS Schema file placement.graphql: /workspace/summit/schema/placement.graphql
PASS Schema file prov-ledger.graphql: /workspace/summit/schema/prov-ledger.graphql

All critical checks passed.
```
