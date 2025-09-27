# Search Indexing Playbook

This guide explains how graph metadata is indexed into Elasticsearch, how to run a full reindex, and how to validate query performance with k6.

## Incremental indexing on ingestion

- The ingestion pipeline now streams entities and relationships directly into Elasticsearch using the `GraphMetadataIndexer` helper. The indexer tracks content hashes so only new or changed documents are sent, cutting redundant writes during steady-state ingestion.【F:simulated_ingestion/ingestion_pipeline.py†L1-L130】【F:simulated_ingestion/indexing.py†L1-L278】
- Incremental runs persist a lightweight state file at `search/index/graph_metadata_index_state.json` and emit a full snapshot to `search/index/graph_metadata_snapshot.json` for disaster recovery or replay scenarios.【F:simulated_ingestion/indexing.py†L197-L273】
- Elasticsearch mappings and analyzers are declared in `search/config/graph_metadata_index.json`. Tunables include custom analyzers for entity names, a 15 s refresh interval, and keyword subfields for faceting.【F:search/config/graph_metadata_index.json†L1-L78】

### Running the simulated pipeline locally

```bash
poetry install  # or pip install -r requirements.in (ensure elasticsearch>=8)
python simulated_ingestion/ingestion_pipeline.py
```

Set `ELASTICSEARCH_URL`, `ELASTICSEARCH_AUTH`, `ELASTICSEARCH_USERNAME`, and `ELASTICSEARCH_PASSWORD` as needed before running. When Elasticsearch is unreachable the pipeline completes without indexing and reports the condition in stdout.【F:simulated_ingestion/ingestion_pipeline.py†L58-L100】

## Full reindex workflow

Use the Python helper to rebuild indices from the most recent snapshot:

```bash
python search/scripts/reindex_graph_metadata.py --purge
# Optional flags:
#   --snapshot /path/to/snapshot.json
#   --batch-size 1000
#   --refresh none
#   --dry-run
```

The script validates the snapshot, optionally drops/recreates indices, streams metadata through the incremental indexer, and prints a final document count summary.【F:search/scripts/reindex_graph_metadata.py†L1-L86】

## Performance validation with k6

- The scenario in `tests/k6/search-metadata.js` issues authenticated hybrid searches against `/api/search/search` with configurable VUs, duration, and pacing. Thresholds enforce p95 ≤ 300 ms and overall success rate ≥ 99 %.【F:tests/k6/search-metadata.js†L1-L65】
- Provide a JWT via `AUTH_TOKEN`, point to the running service with `BASE_URL`, and adjust load using `VUS`, `DURATION`, or `SLEEP`:

```bash
k6 run tests/k6/search-metadata.js \
  -e BASE_URL=http://localhost:4006 \
  -e AUTH_TOKEN=$JWT \
  -e VUS=15 -e DURATION=3m
```

Summaries, observations, and follow-up actions should be captured in `reports/search-metadata-k6-report.md` after each scheduled run.【F:reports/search-metadata-k6-report.md†L1-L62】

## Ongoing maintenance checklist

- Keep `requirements.in` in sync so the Python Elasticsearch client is available in local and CI environments.【F:requirements.in†L1-L15】
- Update the index configuration when adding new searchable fields or analyzers and rerun the reindex script.
- Record k6 results (baseline, regression, post-change) and attach them to change approvals.
