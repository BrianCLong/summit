# Search Metadata k6 Performance Report

## Summary

- **Scenario:** Authenticated hybrid search traffic against `/api/search/search` using `tests/k6/search-metadata.js`.
- **Goal:** Validate that incremental indexing keeps query latency within the 300 ms p95 budget under sustained load.
- **Status:** Pending execution in this environment (Elasticsearch/search engine not running during authoring).

## Test configuration

| Setting | Value |
| --- | --- |
| Command | `k6 run tests/k6/search-metadata.js -e BASE_URL=<search-url> -e AUTH_TOKEN=<jwt>` |
| Virtual users | `VUS=15` (override via env) |
| Duration | `DURATION=3m` (override via env) |
| Think time | `SLEEP=1` second between iterations |
| Thresholds | `http_req_duration{}` p95 < 300 ms, p99 < 500 ms; `checks` > 99 % |

## Results template

| Metric | Threshold | Observed | Status |
| --- | --- | --- | --- |
| HTTP p95 | < 300 ms | _TBD_ | ☐ |
| HTTP p99 | < 500 ms | _TBD_ | ☐ |
| Success rate | > 99 % | _TBD_ | ☐ |
| Error rate | < 1 % | _TBD_ | ☐ |

> Replace `_TBD_` once the test is executed. Attach the k6 JSON summary artifact to the change record for traceability.

## Recommended next steps

1. Launch the search engine with Elasticsearch running locally or in staging.
2. Obtain a short-lived JWT and export it as `AUTH_TOKEN`.
3. Run the command above and capture the k6 summary plus the generated trend metrics.
4. Update the table with observed values and raise alerts if thresholds regress.

## References

- Test script: `tests/k6/search-metadata.js`【F:tests/k6/search-metadata.js†L1-L65】
- Incremental indexer implementation: `simulated_ingestion/indexing.py`【F:simulated_ingestion/indexing.py†L1-L278】
- Reindex automation: `search/scripts/reindex_graph_metadata.py`【F:search/scripts/reindex_graph_metadata.py†L1-L86】
