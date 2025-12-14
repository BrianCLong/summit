
# Summit k6 Load Tests

This directory contains k6 load tests for the Summit API.

## Structure

- `main.js`: The entry point for the load tests. It configures scenarios and thresholds.
- `config.js`: Configuration for base URL, authentication, and test parameters.
- `scenarios/`: Individual test scenarios.
  - `cases.js`: Tests the REST API for Cases (List, Create, Get).
  - `graphql.js`: Tests the GraphQL API (Investigations query).
  - `search.js`: Tests the Search API.

## Running Tests

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed.
- A running instance of the Summit server.

### Configuration

You can configure the test using environment variables:

- `BASE_URL`: The base URL of the API (default: `http://localhost:3000`)
- `TENANT_ID`: The tenant ID to use (default: `tenant-1`)
- `TOKEN`: The authentication token (default: `dev-token`)
- `VUS`: Number of Virtual Users (default: `10`)
- `DURATION`: Test duration (default: `1m`)

### Execution

```bash
# Run with default settings
k6 run k6/main.js

# Run with custom settings
k6 run -e BASE_URL=http://staging-api.example.com -e VUS=50 k6/main.js
```

## Scenarios

1. **Cases**: Simulates an analyst listing cases, creating a new case, and viewing its details.
2. **GraphQL**: Simulates querying the graph for investigations.
3. **Search**: Simulates searching for evidence.

## Monitoring

A Grafana dashboard definition is available at `observability/grafana/dashboards/load-test-metrics.json`. Import this into Grafana to visualize test results (requires k6-prometheus-exporter or similar setup).
