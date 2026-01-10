# GA API Surfaces (Version 4.1.0)

This document enumerates the API surfaces that are considered part of the GA (General Availability) contract for Summit v4.1.0. These surfaces are guaranteed to be stable and are protected by the compatibility policy defined in `API_COMPATIBILITY_POLICY.md`.

The primary consumer of these surfaces is the internal smoke test suite (`make smoke`), which acts as the official verification mechanism for the platform's health.

---

## 1. HTTP Endpoints

These endpoints are used for health checks and basic service availability verification.

| Path                           | Method | Consumer Type         | Evidence Reference                                 | Source Path       |
| ------------------------------ | ------ | --------------------- | -------------------------------------------------- | ----------------- |
| `/`                            | `GET`  | Internal Smoke Test   | `curl http://localhost:3000` in `smoke-test.js`    | `client/`         |
| `/health`                      | `GET`  | Internal Smoke Test   | `curl http://localhost:4000/health` in `smoke-test.js` | `server/`         |
| `/health`                      | `GET`  | Internal Smoke Test   | `curl http://localhost:8080/health` in `Makefile`  | `(Gateway)`       |
| `/healthz`                     | `GET`  | Internal Smoke Test   | `curl http://localhost:8080/healthz` in `Makefile` | `(Gateway)`       |
| `/health`                      | `GET`  | Internal Smoke Test   | `curl http://localhost:4010/health` in `smoke-test.js` | `(Mock Service)`  |
| `/health`                      | `GET`  | Internal Smoke Test   | `curl http://localhost:4100/health` in `smoke-test.js` | `(Worker)`        |
| `/health`                      | `GET`  | Internal Smoke Test   | `curl http://localhost:8181/health` in `smoke-test.js` | `(OPA)`           |
| `/metrics`                     | `GET`  | Internal Smoke Test   | `curl http://localhost:9464/metrics` in `smoke-test.js`| `(OTEL Collector)`|
| `/`                            | `GET`  | Internal Smoke Test   | `curl http://localhost:16686` in `smoke-test.js`   | `(Jaeger)`        |

---

## 2. GraphQL Endpoints

A single introspection query is used to verify that the GraphQL schema is responsive.

| Path       | Method | Query            | Consumer Type       | Evidence Reference                            | Source Path   |
| ---------- | ------ | ---------------- | ------------------- | --------------------------------------------- | ------------- |
| `/graphql` | `POST` | `{ __typename }` | Internal Smoke Test | `testGraphQL()` function in `smoke-test.js` | `server/`     |

---

## 3. CLI Commands

These commands are the entrypoints for running the verification tests and are considered a stable part of the GA contract.

| Command             | Description                                          | Consumer Type            | Evidence Reference                         |
| ------------------- | ---------------------------------------------------- | ------------------------ | ------------------------------------------ |
| `make smoke`        | Runs the full, fresh-clone smoke test suite.         | CI/CD, Developer         | `Makefile`, `docs/releases/MVP-4_GA_BASELINE.md` |
| `make dev-smoke`    | Runs a minimal set of smoke checks for a running stack. | Developer                | `Makefile`, `docs/releases/MVP-4_DEMO_SCRIPT.md` |
| `npm run test:quick`| Runs a quick sanity check of the toolchain.          | Developer                | `package.json`, `docs/releases/MVP-4_DEMO_SCRIPT.md` |

---
