# CompanyOS API

An Express-based reference API for CompanyOS that follows Summit's Node + pnpm patterns. It exposes health and Prometheus metrics endpoints and ships with Jest tests and linting.

## Commands

Use pnpm from repo root:

```bash
pnpm --filter @companyos/companyos-api dev   # run with ts-node-dev
pnpm --filter @companyos/companyos-api build # emit compiled output
pnpm --filter @companyos/companyos-api test  # run Jest tests
pnpm --filter @companyos/companyos-api lint  # lint source files
```

## Endpoints

- `GET /health` – readiness probe returning service metadata
- `GET /metrics` – Prometheus metrics registry

## Environment

Copy `.env.example` to `.env` and adjust as needed.
