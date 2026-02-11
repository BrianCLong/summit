# RC1 Blocker: Smoke and Performance Sanity Failed

## Description
Smoke and performance tests failed:
1. `make dev-smoke` fails because `.env` is missing.
2. `make k6` fails with connection refused on `localhost:4000`.

## Impact
Cannot verify that the system actually runs or meet performance baselines.

## Suggested Fix
1. Ensure `.env` is created from `.env.example`.
2. Ensure services are started (`make up`) before running smoke/perf checks.
