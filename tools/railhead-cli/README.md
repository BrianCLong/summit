# Railhead CLI

Railhead is the Golden Path railhead that bootstraps service repositories with paved-road CI/CD, supply-chain provenance, and OPA policy packs baked in.

## Installation

From the Summit monorepo root:

```bash
npm install --global ./tools/railhead-cli
```

The CLI requires Node.js 20.10.0+.

## Usage

List available templates:

```bash
railhead list
```

Scaffold a new HTTP API service into `./services/order-api`:

```bash
railhead init http-api ./services/order-api \
  --service-name "Order API" \
  --description "Handles order management operations" \
  --registry ghcr.io/acme/orders
```

Additional flags:

- `--dry-run` prints the files that would be created without writing them.
- `--skip-common` avoids copying the shared common assets (useful for ad-hoc experimentation).

## Outputs

Each scaffold includes:

- `.github/workflows/paved-road.yml` – GitHub Actions workflow pinned to vetted SHAs.
- `.pre-commit-config.yaml` – Formatting, linting, TruffleHog secret scanning, OPA policy check.
- `policy/` – OPA bundle snapshot for merge and admission gates.
- `sbom/` – Syft SBOM output path referenced by CI.
- `docs/` – Service-specific README and runbooks referencing cosign & provenance expectations.

## Lockfile Metadata

To view the pinned toolchain versions used by the templates run:

```bash
railhead lock
```

This prints `templates/golden-path/lock.json`, which platform engineering updates as part of dependency curation.
