# Synthetic Monitoring Journeys

This document defines the synthetic user journeys used to monitor the health and performance of the Summit/IntelGraph platform. These journeys are executed periodically by the synthetic runner to ensure critical user flows are functioning correctly.

## Journey Definitions

### J-001: Basic Login

**Goal**: Verify that a user can authenticate and receive a valid JWT.

- **Steps**:
  1.  Call GraphQL `login` mutation with test credentials.
  2.  Verify response contains `token` and `user` object.
  3.  Store token for subsequent steps.
- **Success Criteria**: HTTP 200, valid token returned.

### J-002: Upload Dataset

**Goal**: Verify the data ingestion pipeline.

- **Pre-requisites**: Authenticated user (from J-001).
- **Steps**:
  1.  Create a temporary Investigation via GraphQL `createInvestigation`.
  2.  Generate a small in-memory CSV (3 rows: source, target, type).
  3.  POST to `/api/import/csv/analyze` to get field mappings.
  4.  POST to `/api/import/csv/import` with the mapping and `investigationId`.
  5.  Poll job status until complete (optional, or check via graph query).
- **Success Criteria**: Job accepted (HTTP 200) and completes successfully.

### J-003: Perform Graph Queries

**Goal**: Verify Neo4j connectivity and GraphQL read performance.

- **Pre-requisites**: Authenticated user.
- **Steps**:
  1.  Execute GraphQL `entities` query (fetch first 3).
  2.  Execute GraphQL `relationships` query (fetch first 3).
  3.  Execute `graphData` query for the investigation created in J-002.
- **Success Criteria**: Queries return HTTP 200 and expected data structure.

### J-004: Trigger Maestro Run

**Goal**: Verify the Maestro orchestration engine is accepting requests.

- **Pre-requisites**: Authenticated user.
- **Steps**:
  1.  POST to `/api/maestro/runs` with a simple prompt (e.g., "Analyze the connection between A and B").
  2.  Capture `run` object from response.
- **Success Criteria**: HTTP 200, valid `run` object returned.

### J-005: Wait for Job Completion

**Goal**: Verify background processing (Maestro/Workers).

- **Pre-requisites**: Maestro run initiated (J-004).
- **Steps**:
  1.  If the API is synchronous (v0), this step is implicit.
  2.  If asynchronous, poll `/api/maestro/runs/{id}` until `status` is `completed` or `failed`.
- **Success Criteria**: Run status becomes `completed` or `succeeded`.

### J-006: Fetch Result & Evaluate

**Goal**: Verify the integrity of the output.

- **Pre-requisites**: Completed Maestro run.
- **Steps**:
  1.  Inspect the run results/artifacts.
  2.  Check for non-empty output or specific expected strings.
- **Success Criteria**: Results are present and not empty.

## Execution Strategy

- **Frequency**: Every 5-15 minutes in staging/production.
- **Runner**: `scripts/synthetic/run-journey.ts`
- **Identity**: Dedicated `synthetic-monitor` user account.
- **Alerting**:
  - Latency > 2000ms (p95) triggers warning.
  - Any failure (HTTP 4xx/5xx, logic error) triggers critical alert.
