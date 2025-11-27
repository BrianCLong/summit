# api-svc-template

Golden-path starter for CompanyOS API services. Includes Express + OpenTelemetry-friendly logging/metrics, OPA-aware authorization helper, CI workflow, and Docker/Make targets to keep new services consistent.

## Getting started

```bash
corepack enable
pnpm install --no-frozen-lockfile
pnpm dev
```

The service listens on `PORT` (environment override) or `config/service.port` and exposes:
- `GET /health` basic readiness
- `GET /metrics` Prometheus registry

## Scripts

- `pnpm dev` – watch-mode dev server via `tsx`
- `pnpm test` – Vitest + Supertest health check
- `pnpm lint` – ESLint (TS)
- `pnpm build` – TypeScript compile to `dist/`
- `pnpm sbom` – generate `sbom.json` using `syft`

Make targets mirror the scripts for convenience.

## Configuration

- Config profiles live in `config/` (`default`, `dev`, `prod`).
- `.env.example` documents `NODE_ENV`, `PORT`, and `OPA_URL` for the authorization middleware.

## CI/CD

`.github/workflows/service-ci.yml` matches the Summit CI shape: install, lint, test, build, and always-attempt SBOM generation.

## Smoke check

```
pnpm build && node scripts/smoke-healthcheck.mjs
```
