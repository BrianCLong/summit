# Summit Golden Path API

This repository was scaffolded from the Golden Path HTTP API template. It ships paved-road workflows that output signed, SBOM-attached, provenance-verified releases by default.

## Development

```bash
npm install
npm run dev
```

## Testing & Quality Gates

- `npm run lint` – ESLint + Prettier.
- `npm test` – Jest unit tests with coverage.
- `npm run verify` – Runs lint, test, and policy checks together.

## Deployment Flow

1. Merge to `main` triggers the **Paved Road CI/CD** workflow.
2. SBOM and vulnerability reports land in `sbom/sbom.json` and `reports/grype.json` artifacts.
3. Cosign keyless signing produces `release.sig` and `release.pem`.
4. SLSA provenance JSON is uploaded as a release asset for downstream verification.
5. `deploy-canary` job verifies the signature before invoking your deployment automation.

## Policy Budgets

The default CVE budget is `0` high/critical findings. Adjust `.opa/input.json` preparation in CI if you need a temporary exception, but document approvals in `docs/exceptions.md`.

## Observability

Synthetic probes live under `synthetics/` and are intended to be mirrored into the platform uptime monitors.
