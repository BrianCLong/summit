# Deployment Process and Validation

This directory, alongside `scripts/deploy`, holds the necessary configuration and scripts for ensuring our deployments to various environments (e.g. `stage`, `prod`) are safe and reliable. The pre-deploy validation ensures that expected configurations are present and that dependencies are reachable before any traffic is served or actual changes are rolled out.

## Validation Flow

The pre-deployment validation automation ensures environment checks and post-deploy verifications run consistently. It uses declarative manifests to describe what an environment requires to be considered "ready".

### Key Scripts

- **`scripts/deploy/pre-deploy-checklist.sh`**: The main entry point for starting validations. It determines the correct manifest for a given environment and enforces the checks.
  - **Usage**: `./scripts/deploy/pre-deploy-checklist.sh <environment>` (e.g., `./scripts/deploy/pre-deploy-checklist.sh stage`)
  - **Behavior**: Calls the `validate-environment.sh` script, outputs a formatted JSON result, and fails (exits non-zero) if any critical checks fail.

- **`scripts/deploy/validate-environment.sh`**: The worker script that parses the environment manifest and performs the checks.
  - **Usage**: `./scripts/deploy/validate-environment.sh <path_to_manifest>`
  - **Output**: Returns a JSON document structured with a `status`, `results` by check type (`env_vars`, `connectivity`, `configs`), and a `summary`.

### Defining Environment Manifests

Manifests are located in `environments/<environment>/validation.yaml`. They define:
- `env_vars`: A list of required environment variables that must be set in the deployment context.
- `connectivity`: Services (databases, caches, external APIs) that must be reachable. Define `type` as `tcp` or `http`. You must specify `host` and `port` for `tcp`, or `url` for `http`. Set `critical: true` to block the deployment if the check fails.
- `configs`: Abstract names of configuration maps or secrets that are expected to exist.

### Example Manifest (`environments/stage/validation.yaml`)

```yaml
environment: "stage"

env_vars:
  - "DATABASE_URL"
  - "API_KEY"

connectivity:
  - name: "Primary Database"
    type: "tcp"
    host: "db.stage.internal"
    port: 5432
    critical: true
  - name: "Payment Gateway API"
    type: "http"
    url: "https://api.stripe.com/healthcheck"
    critical: false

configs:
  - "auth-secrets"
```

### Interpreting Failures

When running the `pre-deploy-checklist.sh` script, the JSON output provides granular insight into what failed.
If you receive a `status: failure`:
1. Look into the `results` object.
2. Under `env_vars`, if a required variable has `"passed": false`, ensure it is exported or provided by the CI/CD pipeline correctly.
3. Under `connectivity`, look at the `error` message. For TCP checks, the host may be unreachable or DNS may have failed. For HTTP checks, the endpoint may be down or returning a non-2xx/3xx status code.
4. Non-critical failures (where `critical: false`) will be marked as `"passed": false` but will not block the deployment or cause the script to exit with a non-zero code. Critical failures will immediately halt the deploy process.

All scripts are idempotent and safe to be executed multiple times without side effects.
