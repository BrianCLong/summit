# REST API Reference

The Summit platform provides a set of RESTful APIs for coherence analysis, graph management, and orchestration.

## Coherence API

Base URL: `https://api.summit.io/api/v1/coherence`

### Endpoints

#### `GET /health`

Check the health status of the coherence service.

- **Response**: `200 OK`
- **Schema**: `HealthStatus`

#### `POST /signals/ingest`

Ingest a single coherence signal.

- **Authentication**: Bearer Token
- **Request Body**: `SignalIngestRequest`
- **Response**: `201 Created`
- **Schema**: `SignalIngestResponse`

#### `POST /signals/batch`

Ingest multiple coherence signals in a single request (max 100).

- **Authentication**: Bearer Token
- **Request Body**: `BatchSignalRequest`
- **Response**: `200 OK`
- **Schema**: `BatchSignalResponse`

#### `POST /analysis`

Perform coherence analysis for a tenant.

- **Authentication**: Bearer Token
- **Request Body**: `AnalysisRequest`
- **Response**: `200 OK`
- **Schema**: `AnalysisResponse`

#### `GET /status/{tenantId}`

Get current coherence status for a tenant.

- **Authentication**: Bearer Token
- **Parameters**: `tenantId` (path)
- **Response**: `200 OK`
- **Schema**: `CoherenceStatus`

---

## IntelGraph Core API

Base URL: `/api/intelgraph/v1`

### Entities

#### `GET /entities`

List all entities.

- **Response**: `200 OK`
- **Schema**: Array of `Entity`

#### `GET /entities/{entityId}`

Get an entity by ID.

- **Parameters**: `entityId` (path)
- **Response**: `200 OK`
- **Schema**: `Entity`
- **Errors**: `404 Not Found`

### Relationships

#### `GET /relationships`

List all relationships.

- **Response**: `200 OK`
- **Schema**: Array of `Relationship`

---

## Maestro Orchestration API

Base URL: `/api/maestro/v1`

### Runs

#### `GET /runs`

List all Maestro runs.

- **Response**: `200 OK`
- **Schema**: Array of `Run`

#### `POST /runs`

Create a new Maestro run.

- **Request Body**: `CreateRunRequest`
- **Response**: `201 Created`
- **Schema**: `Run`

#### `GET /runs/{runId}`

Get a Maestro run by ID.

- **Parameters**: `runId` (path)
- **Response**: `200 OK`
- **Schema**: `Run`
- **Errors**: `404 Not Found`

### Pipelines

#### `GET /pipelines`

List all Maestro pipelines.

- **Response**: `200 OK`
- **Schema**: Array of `Pipeline`

### Budgets

#### `GET /budgets/tenant`

Get a tenant's budget details.

- **Parameters**: `tenant` (query)
- **Response**: `200 OK`
- **Schema**: `Budget`

### Alerts

#### `GET /alertcenter/events`

List all alert events.

- **Response**: `200 OK`
- **Schema**: Array of `AlertEvent`

### Handoff

#### `POST /handoff/fastlane`

Submit a fastlane handoff request for expedited processing.

- **Request Body**: `FastlaneHandoffRequest`
- **Response**: `200 OK`
- **Schema**: `FastlaneHandoffResponse`
- **Errors**: `429 Too Many Requests`
