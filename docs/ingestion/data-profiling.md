# Interactive Data Profiling Tool

The Summit UI now includes an analyst-facing data profiling experience that surfaces column-level quality
metrics for ingested PostgreSQL tables. The workflow is powered by a lightweight Python profiler that the
GraphQL API orchestrates on demand.

## Frontend experience

- **Entry point:** Navigate to **Data Profiling** in the primary navigation or visit
  `/ingestion/profiling` directly once authenticated.
- **Key capabilities:**
  - Pick a schema (default `public`) and table, then request profiling with configurable sample size and
    top-k values for frequency analysis.
  - Review null rates, distinct counts, numeric summaries, and sampled top values for every column in the
    selected table.
  - Profiling summaries are timestamped so analysts can confirm the freshness of the insight.

The React implementation lives in `client/src/components/ingestion/DataProfilingTool.tsx` and is wrapped by
`client/src/pages/ingestion/DataProfilingPage.tsx` for routing. The component relies on two Apollo queries
(`IngestionTables` and `DataProfile`) that are exported from
`client/src/graphql/queries/dataProfiling.ts`.

## GraphQL API

Two new query fields were added to the core schema (`server/src/graphql/schema.core.js`):

- `ingestionTables(schema: String = "public")` – returns the available tables within a schema along with an
  approximate row count derived from PostgreSQL statistics.
- `dataProfile(table: String!, schema: String, sampleSize: Int = 5000, topK: Int = 5)` – executes the Python
  profiler for the requested table and returns column-level metrics.

Resolver logic lives in `server/src/graphql/resolvers/core.ts` and reuses the shared PostgreSQL pool. The data
profiling resolver spawns the Python script and converts its JSON output into the GraphQL response.

## Python profiler

The profiling script is implemented in `server/python/data_profiling/profile_data.py` and depends on
`psycopg2-binary` (declared in `server/requirements.txt`). It:

1. Validates the requested schema/table identifiers.
2. Connects to PostgreSQL using repository environment variables.
3. Computes counts, null rates, distinct counts, numeric summaries, and frequency distributions for each
   column.
4. Emits a JSON payload that the GraphQL resolver streams back to the client.

You can run the profiler locally without GraphQL by invoking:

```bash
python server/python/data_profiling/profile_data.py --table your_table --schema public --sample-size 5000 --top-k 5
```

## Testing

A Playwright scenario (`client/tests/e2e/data-profiling.spec.ts`) stubs the GraphQL responses and verifies the UI
renders profiling insights. Execute it with:

```bash
npm run e2e -- data-profiling.spec.ts
```

This test covers navigation, parameter entry, and the rendering of summary metrics for both categorical and
numeric columns.
