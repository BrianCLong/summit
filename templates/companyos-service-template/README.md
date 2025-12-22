# CompanyOS Service Template

The "Golden Path" for building new services at CompanyOS.
Clone this template to spin up a production-ready service in minutes.

## Features

- **Typed Service Skeleton**: TypeScript/Express with strict typing.
- **Observability**: Structured logging (Pino), Prometheus metrics, and Request ID propagation.
- **Health Checks**: `/healthz` and `/readyz` endpoints.
- **Config Management**: Environment variable validation.
- **Docker-First**: `Dockerfile` and `docker-compose` for local dev.
- **CI/CD**: GitHub Actions workflow for building, testing, scanning (SBOM, Trivy), and signing (Cosign).
- **Policy Enforcement**: OPA integration for ABAC.

## New Service in 10 Minutes

### 1. Clone & Rename
```bash
# Clone the template (or copy from monorepo)
cp -r templates/companyos-service-template my-new-service
cd my-new-service

# Initialize git if standalone
git init
git add .
git commit -m "feat: Initial commit from golden path template"
```

### 2. Configure
Update `package.json` with your service name:
```bash
npm pkg set name="my-new-service"
```

### 3. Run Locally
Start the development stack (Service + Postgres + Redpanda):
```bash
make dev
```
Access the service at http://localhost:3000

### 4. Verify
Run the smoke test:
```bash
make e2e
```

## Development Commands

- `make dev`: Start local development stack.
- `make test`: Run unit/integration tests.
- `make lint`: Check code style.
- `make build`: Compile TypeScript.
- `make run`: Run the service locally (requires .env).
- `make e2e`: Run smoke tests against the running service.

## Configuration

Set the following environment variables (defaults provided in `src/config.ts`):

- `PORT`: Service port (default: 3000)
- `LOG_LEVEL`: info, debug, etc.
- `METRICS_ENABLED`: true/false
- `POLICY_ENDPOINT`: OPA endpoint

## Deployment

The included CI workflow (`.github/workflows/companyos-service-template-ci.yml`) handles:
1. Linting & Testing
2. Security Scans (Gitleaks, Semgrep, Trivy)
3. SBOM Generation
4. Container Build & Push to GHCR
5. Image Signing with Cosign

To enable deployment, ensure your repo secrets (`GITHUB_TOKEN`, etc.) are configured.
