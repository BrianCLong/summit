# IntelGraph Search Service

The search service exposes a FastAPI application that layers multi-backend full-text capabilities with in-memory fallbacks. It supports Elasticsearch, OpenSearch, and MeiliSearch where available while keeping deterministic, dependency-free mocks for local development and testing.

## Features
- Hybrid backend selection: pick `elasticsearch`, `opensearch`, `meilisearch`, or `mock` per request.
- Fuzzy search with field boosts for relevance tuning.
- Faceted navigation on arbitrary fields.
- Query suggestions blended from live analytics and corpus-derived candidates.
- Search analytics endpoint for latency and language breakdowns.
- Multi-language awareness with analyzer hints and language filtering.

## Configuration
- `ELASTICSEARCH_URL`: enable Elasticsearch integration when installed.
- `MEILISEARCH_URL` / `MEILISEARCH_API_KEY`: enable MeiliSearch integration.
- `OPENSEARCH_HOST`: enable OpenSearch integration.
- If none are provided, the service responds using the deterministic mock dataset defined in `src/main.py`.

## API
- `POST /search/query`: execute a search request. Body fields include `query`, `backend`, `fuzziness`, `facets`, `filters`, `boosts`, and `language`.
- `GET /search/suggest`: fetch blended suggestions for a prefix; accepts `q` and optional `language`.
- `GET /search/analytics`: returns query counts, language distribution, and latency percentiles.
- `GET /search/schemas`: returns the indexed document schema for orchestration/ingestion pipelines.
- `POST /search/index`: stub endpoint for controlling indexing jobs.

## Development
Run the FastAPI server locally:

```bash
uvicorn services.search.src.main:app --reload --port 8000
```

Run tests:

```bash
python -m pytest services/search
```
