# Contract Test: Query Copilot → Gateway

## Purpose
Ensure the query-copilot client remains compatible with gateway search endpoints and privacy headers. Breaking API changes must fail before merge.

## Consumer Expectations
- Endpoint: `POST /v1/search/unified`
- Required headers: `Authorization`, `X-Purpose` (non-empty, valid purpose), `X-Tenant`
- Request body: `{ query: string, filters: { types?: string[], sources?: string[], timeRange?: { from: string, to: string } } }`
- Response: `200 OK` with fields `items[]`, `cursor` optional, `perf.took_ms`, and `budget.remaining`.

## Provider Verification
- Pact-like JSON schema validated in CI (`pnpm test:contracts`).
- Compatibility harness replays fixtures for prior versions (`v1`, `v2` when available).
- Negative tests: missing `X-Purpose` → `412 Precondition Failed`; mismatched tenant → `403`.

## Failure Handling
- CI will block merge if provider deviates from consumer contract unless accompanied by version bump + migration guide (see API versioning governance).
