# API Contracts

## `runtime`
*   `POST /execute`: Run a module. Requires `{ "module": "...", "inputs": {} }`. Returns `{ "run_id": "...", "status": "running" }`.
*   `GET /status/{run_id}`: Check execution status.

## `scheduler`
*   `POST /jobs`: Schedule a scan.
*   `GET /jobs`: List upcoming jobs.

## `capture`
*   `POST /proxy`: Transparent proxy endpoint. Records headers, payload, and response.

## `evidence`
*   `POST /bundles`: Upload a new evidence bundle. Returns `{ "evidence_id": "ev1:..." }`.
*   `GET /bundles/{evidence_id}`: Fetch signed bundle.
*   `GET /bundles/{evidence_id}/verify`: Verify signature.

## `graph`
*   `POST /entities`: Upsert entities.
*   `POST /edges`: Upsert provenance edges.
*   `GET /query`: Cypher query endpoint.

## `cases`
*   `POST /cases`: Create a case.
*   `POST /cases/{case_id}/tasks`: Add a task.

## `integrations`
*   `POST /webhooks/inbound`: Receive enrichment data.
*   `POST /push/{target}`: Push findings to target SIEM/SOAR.
