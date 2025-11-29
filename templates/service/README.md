# Paved Road Service Template

This is the standard template for creating new Node.js/TypeScript services in CompanyOS.

## Features

*   **Express** server with strict TypeScript config.
*   **Structured Logging** via Pino (with trace ID propagation).
*   **Metrics** via Prometheus (`/metrics`).
*   **OpenTelemetry** auto-instrumentation hooks.
*   **Docker Compose** for local development.
*   **Dockerfile** for production builds.

## Getting Started

1.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Run locally (with hot reload):
    ```bash
    pnpm run dev
    ```
    OR using Docker Compose:
    ```bash
    docker compose up
    ```

4.  Test endpoints:
    *   Health: `curl http://localhost:3000/health`
    *   Metrics: `curl http://localhost:3000/metrics`

## Project Structure

*   `src/index.ts`: Entry point.
*   `src/app.ts`: Express app configuration.
*   `src/routes/`: API routes.
*   `src/utils/`: Utilities (logger, etc).
*   `src/telemetry.ts`: OpenTelemetry setup.
