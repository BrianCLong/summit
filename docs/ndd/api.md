# NDD API Surface (Proposed)

## Read Endpoints
- `GET /api/ndd/clusters?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Returns narrative clusters with summaries and evidence IDs.
- `GET /api/ndd/alerts?severity=low|medium|high`
  - Returns alerts with explainability payloads.
- `GET /api/ndd/evidence/{evidenceId}`
  - Returns the evidence bundle for a given ID.

## Write Endpoints (Governed)
- `POST /api/ndd/runs`
  - Triggers batch run; requires privileged role and policy approval.

## Response Contracts (High-Level)
- All responses include `policy_status` and `audit_id`.
- Evidence access returns `allowed=false` when policy denies.
