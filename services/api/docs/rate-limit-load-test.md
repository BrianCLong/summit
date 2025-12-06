# Rate-limit Load Test Scenario

Use the companion script at `services/api/docs/rate-limit-load-test.js` to validate the Redis-backed sliding window enforcement and backoff behavior.

## What to watch
- `/metrics` should show rising `rate_limit_blocked_total` and `rate_limit_backoff_ms` when the spike stage begins.
- Verify that once Redis is temporarily stopped, requests fail open to the in-memory limiter and `rate_limit_circuit_open` flips to `1`.
- Confirm that per-API-key quotas are enforced by setting `API_KEY` to different keys defined in `RATE_LIMIT_API_KEY_QUOTAS`.

## Running the test
1. Export test parameters:
   ```bash
   export BASE_URL=http://localhost:4000
   export API_KEY=premium-client
   ```
2. Run k6:
   ```bash
   k6 run services/api/docs/rate-limit-load-test.js
   ```
3. Inspect `/metrics` and Grafana dashboards during and after the run to validate recovery and backoff behaviors.
