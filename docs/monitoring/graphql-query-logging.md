# GraphQL Query Logging & Analytics

## Overview
The Summit API server now emits OpenTelemetry-backed logs for every GraphQL request. A dedicated Apollo Server plugin captures execution timing, sanitized parameters, user context, and trace identifiers, then ships the payload to Elasticsearch for long-term analytics. A companion Grafana dashboard surfaces throughput, latency, and error trends for platform operators.

## Instrumentation details
- **Plugin**: `server/src/graphql/plugins/queryLoggingPlugin.ts`
  - Starts a `graphql.request` span for each operation and records execution duration, root selections, and OpenTelemetry end-user attributes.
  - Sanitizes GraphQL variables (array lengths, object key previews, truncated scalar values) before logging.
  - Streams structured documents to Elasticsearch with the index name configured through `GRAPHQL_QUERY_LOGS_INDEX` (defaults to `graphql-query-logs-v1`).
  - Automatically enriches log entries with request IDs, HTTP metadata, and formatted resolver errors when present.
- **Server wiring**: the plugin is registered alongside existing security and observability middleware in `server/src/app.ts`, ensuring coverage for all `/graphql` traffic.

## Configuration
Set the following environment variables on the API server:

| Variable | Purpose | Default |
| --- | --- | --- |
| `GRAPHQL_QUERY_LOGS_ENABLED` | Toggle logging without redeploying. | `true` |
| `GRAPHQL_QUERY_LOGS_URL` | Override Elasticsearch endpoint (falls back to `ELASTICSEARCH_URL`). | – |
| `GRAPHQL_QUERY_LOGS_INDEX` | Target index or data stream name. | `graphql-query-logs-v1` |
| `GRAPHQL_LOG_MAX_QUERY_LENGTH` | Maximum persisted query length (characters). | `2000` |
| `GRAPHQL_LOG_MAX_VARIABLE_VALUE_LENGTH` | Maximum persisted scalar variable length. | `256` |
| `GRAPHQL_LOG_ELASTIC_TIMEOUT_MS` | Timeout for Elasticsearch writes. | `2000` |

> **Security note:** Only summaries of variable payloads are logged. Sensitive values remain redacted via length and structure-based scrubbing.

## Elasticsearch schema
Apply the supplied index template before enabling ingestion:

```bash
curl -X PUT \
  "$ELASTICSEARCH_URL/_index_template/graphql-query-logs" \
  -H 'Content-Type: application/json' \
  --data-binary @search/index/graphql-query-logs-template.json
```

The mapping stores flattened `variables` for flexible ad-hoc filters, nested `errors` for drill-down, and keyword fields for request/user metadata. All documents require the standard `@timestamp` field for time-based visualizations.

## Querying with the search-engine
The search-engine can now target observability datasets by passing explicit indices:

```ts
const response = await elasticsearchService.search({
  query: '*',
  filters: {
    indices: ['graphql-query-logs-v1'],
    custom: {
      status: 'error'
    }
  },
  searchType: 'fulltext'
});
```

When `filters.indices` is present, the service bypasses the default entity index set, making the GraphQL log store queryable through the existing API surface.

## Grafana dashboard
Import `server/grafana/graphql-query-analytics.json` into Grafana and bind it to an Elasticsearch data source pointing at the `graphql-query-logs*` pattern. The dashboard ships with:

1. Query volume split by status.
2. p95 execution time trend.
3. Top operations by request count.
4. Average duration for failed queries.

## Troubleshooting
- **No documents indexed:** confirm the OpenTelemetry environment variables and verify network access to the configured Elasticsearch URL. The plugin logs warnings if requests time out or the endpoint is unreachable.
- **Missing fields in Grafana:** ensure the index template applied successfully and that data uses the `graphql-query-logs-v1` (or configured) index name.
- **Search API returns empty results:** verify `filters.indices` matches the actual index alias and that the search user has read privileges on the observability dataset.
