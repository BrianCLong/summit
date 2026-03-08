# Data Handling: Eval-driven Agentic RAG

## Principles
- Never log: raw user secrets, access tokens, session cookies, full retrieved document bodies.
- Allowed: chunk IDs + short excerpts (bounded), hashes, authority/recency metadata.
- Retention: CI artifacts (e.g. `report.json`, `stamp.json`) are retained for 30–90 days matching the SOC artifact retention style.
