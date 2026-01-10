# API Contract Snapshots (v4)

This document provides representative snapshots of the requests and responses for the GA API surfaces defined in `GA_API_SURFACES.md`. These snapshots serve as a reference for the expected behavior of the system's smoke test suite.

The canonical, machine-readable source of truth for these contracts is the `smoke-test.js` script and the `Makefile`.

---

## 1. HTTP Health Checks

The standard health check endpoints are expected to return an HTTP `2xx` status code. The response body is not parsed by the smoke tests, but a simple JSON status is conventional.

### Standard Health Check (`/health`, `/healthz`)

**Representative Request:**

```bash
curl -v http://localhost:4000/health
```

**Representative Successful Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 15

{"status":"ok"}
```

**Variability**: The response body may vary or be empty. Any `2xx` status code is considered a success. This contract applies to all health check endpoints listed in `GA_API_SURFACES.md`.

---

## 2. GraphQL Introspection Check

The GraphQL endpoint's availability is checked via a simple introspection query.

### Introspection Query (`/graphql`)

**Representative Request:**

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}' \
  http://localhost:4000/graphql
```

**Representative Successful Response:**

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 31

{"data":{"__typename":"Query"}}
```

**Variability**: The `__typename` field must be present in the `data` object and have the value `"Query"`. Additional fields in the response are permissible.

---

## 3. CLI Commands

The CLI commands are snapshotted by their invocation method. Their output is not strictly checked, but their exit code must be `0` for success.

### `make smoke`

**Invocation:**

```bash
make smoke
```

**Expected Result:** The command executes the full smoke test suite and exits with code `0`.

### `make dev-smoke`

**Invocation:**

```bash
make dev-smoke
```

**Expected Result:** The command executes the minimal smoke test suite and exits with code `0`.

### `npm run test:quick`

**Invocation:**

```bash
npm run test:quick
```

**Expected Result:** The command executes a toolchain sanity check and exits with code `0`.

---
