# Golden Path Platform

The Golden Path Platform delivers paved-road scaffolding, CI/CD, and compliance guardrails that emit signed, SBOM-attached, provenance-verified releases by default.

## Components

- **Railhead CLI** (`tools/railhead-cli`): one-command scaffold for HTTP API, worker, and UI services.
- **Templates** (`templates/golden-path`): service blueprints with pinned dependencies, GitHub Actions workflows, and documentation.
- **OPA Bundle** (`policy/golden-path`): merge/deploy gates for license allowlist, CVE budgets, and secret scanning.
- **Example Service** (`examples/golden-path/api-service`): working repo generated from the HTTP API template.

## Getting Started

1. Install the CLI: `npm install --global ./tools/railhead-cli`.
2. Generate a repo: `railhead init http-api ./services/orders --service-name "Orders API" --registry ghcr.io/acme/orders`.
3. Push to GitHub and enable actions. The `Paved Road CI/CD` workflow runs automatically.
4. Configure admission controller verification with the OPA bundle and cosign verification script under `controllers/admission/`.

## SLOs

- Pipeline p50 < 8 minutes (workflow uses caching + deterministic builds).
- Template bootstrap < 90 seconds (`railhead` outputs ready repo structure).
- ≥ 98% successful green builds on main (policy gating + deterministic pipeline).

## Evidence

Attach SBOM samples, cosign verification logs, and provenance JSON into `.evidence/` directories. Include links in `.prbodies/` when filing PRs.
