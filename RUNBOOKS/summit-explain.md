# Runbook: summit explain

**Description:**
Troubleshoots issues with the `summit explain` CLI and API.

**Common Issues:**
1. **Parser Grammar Mismatch:** If tree-sitter fails to parse, ensure the language grammar is installed and up to date.
2. **API Outage Fallback:** If OpenAI is down, `summit explain` should gracefully fall back to heuristic-based offline mode.
3. **Postgres/pgvector degraded mode:** Ensure database connections are healthy if semantic retrieval is enabled.

**Alerts:**
* `explain failure rate spike`: Triggered if >5% of requests fail within 5m.
* `p95 latency breach`: Triggered if p95 latency > 8s.
* `artifact contract failure`: Triggered if Pydantic validation fails during serialization.
