# Golden Path Service Template (TypeScript)

This is the canonical "Golden Path" template for building Node.js/TypeScript services at CompanyOS.

## Features

- **Express v5**: Modern web framework.
- **TypeScript**: Type safety.
- **Structured Logging**: `pino` with JSON output.
- **Metrics**: Prometheus metrics via `prom-client` at `/metrics`.
- **Configuration**: Zod-validated environment variables.
- **Testing**: Jest + Supertest.
- **Docker**: Optimized multi-stage build.

## Quick Start

1. Copy this directory to `services/your-service-name`.
2. Rename `package.json` name.
3. Run `npm install`.
4. Run `npm run dev` to start locally.

## Endpoints

- `GET /health`: Health check.
- `GET /metrics`: Prometheus metrics.
- `GET /`: Hello message.
