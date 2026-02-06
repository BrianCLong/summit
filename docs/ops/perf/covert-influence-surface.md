# Performance Budget: Covert Influence Surface

## Latency Targets
* **Fast Path (Ingest -> PIE -> Rescore)**: < 5 minutes for watchlisted terms.
* **Batch Path (Nightly CIE)**: < 10 minutes for 50k artifacts / 200k edges (initial budget).

## Resource Limits
* **LLM Usage**: Bounded; narratives primarily templated.
* **Storage**: Retain hashes/manifests; raw content opted-in/redacted.
