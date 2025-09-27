# Consent-Aware Feature Flags (CAFF)

CAFF is a Go microservice for evaluating purpose-scoped feature flags. Flags bind to consent purposes, jurisdiction, audience, and expiry metadata. Evaluations return deterministic `allow`, `deny`, or `step-up` decisions alongside an explainability path that lists the rules involved.

## Features

- Purpose-aware, jurisdiction-aware, and audience-aware flag rules
- Sticky bucketing with deterministic hashing
- Dry-run policy diffing to preview impacted flags and decision changes
- REST API with JSON payloads
- TypeScript SDK and Next.js demo app (see `sdk/typescript` and `demos/caff-demo`)

## Running Locally

```bash
go mod tidy
go test ./...
go run .
```

By default the service listens on `:8080`. Override with `CAFF_HTTP_ADDR`.

## API Surface

- `GET /healthz`
- `GET /policy`
- `PUT /policy` — replace the current policy
- `POST /evaluate` — body `{ "flagKey": "flag", "context": { ... } }`
- `POST /dry-run` — body `{ "oldPolicy": {...}, "newPolicy": {...}, "contexts": [...] }`

All responses include deterministic explain paths that enumerate the rules that were evaluated for traceability.
