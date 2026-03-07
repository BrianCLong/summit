# Agent Benchmark Spine Data Handling

## Classification
* **Fixture prompt:** Internal
* **Expected evidence IDs:** Internal
* **Benchmark score:** Internal now, promotable later
* **Deterministic artifacts:** Internal until certification is implemented

## Retention
* Keep the last 30 successful local artifacts.
* Keep CI artifacts per repository default retention policies.
* No long-term retention requirement.

## Never-Log
The following must NEVER be logged:
* Secrets
* API keys
* Bearer tokens
* Raw customer content
* Live production traces
