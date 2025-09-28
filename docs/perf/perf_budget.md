# Performance Budget and SLOs (PR-14)

- GraphQL p95 latency: <= 400ms (light queries), p99 <= 1500ms (heavy)
- Ingest start → first progress: <= 2s
- Copilot NL→Cypher preview: <= 300ms (heuristic)
- Copilot RAG small answers: <= 800ms (local)

Toggles and tools
- Slow query logger: set `SLOW_QUERY_MS=500` and inspect warnings
- Smoke tests: `k6 run load/k6_smoke.js`
- Perf snapshot: capture `GET /metrics` and k6 output; attach to release notes
