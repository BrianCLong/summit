# COS-EVIDENCE-PUB — Publish Evidence (SLO+Cost) to MC

## Goal
Emit canonical release Evidence payloads enriched with SLO and cost telemetry to the MC GraphQL API, ensuring idempotent retries and stakeholder visibility within one minute of rollout completion.

## Key Outcomes
- Production-ready `publishEvidence` client with resilient retries, Sigstore token handling, and deduplication.
- Evidence payload contains SBOM/test artifact hashes, latency/error metrics, and unit cost data correlated to `releaseId`.
- Dashboards expose evidence submission status; duplicate sends logged and ignored.
- Finance and MC stakeholders approve payload structure and redaction safeguards.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Release Pipeline | Collects rollout metadata, triggers evidence submission job. |
| Evidence Client | Builds payload, handles retries, signs requests, and ensures idempotency. |
| Observability Aggregator | Supplies p95/p99 latency, error rates, and cost telemetry snapshots. |
| Artifact Registry | Provides SBOM and test artifact hashes referenced in payload. |
| MC GraphQL API | Receives evidence payload and surfaces `evidenceOk` signal. |
| Metrics & Logging | Tracks submission attempts, successes, dedupe events, and latency. |

### Data Flow
1. Rollout job reads `releaseId` from pod/deployment labels and collects telemetry snapshots.
2. Evidence client assembles payload including SBOM/test hashes, metrics, and provenance metadata.
3. Client signs request using MC-issued token (stored in External Secrets) and executes GraphQL mutation with idempotency key.
4. On success, MC returns status; client records outcome in metrics and logs.
5. On failure, client retries with jittered exponential backoff and surfaces alert if thresholds exceeded.

## Implementation Plan
### Phase 0 — Alignment (Week 1)
- Finalize payload schema with MC and Finance; document required fields and redaction rules.
- Provision MC API token, configure secure secret storage, and set up sandbox access for contract tests.

### Phase 1 — Client Development (Week 1)
- Implement GraphQL client with typed schema, token injection, and idempotency key support.
- Add payload builders for SBOM/test hash ingestion and telemetry snapshot formatting.
- Build retry strategy with jitter, capped attempts, and dedupe detection on HTTP 409 responses.

### Phase 2 — Integration (Week 2)
- Wire client into rollout pipeline (Argo Workflow or CI job) with releaseId discovery.
- Connect to observability APIs to fetch p95/p99/errorRate/unit cost metrics at rollout checkpoints.
- Emit Prometheus metrics for submission latency, retries, dedupe counts, and failure rates.

### Phase 3 — Validation & Docs (Week 2)
- Run contract tests against MC sandbox, capturing golden payload fixtures.
- Execute end-to-end rollout simulation verifying `evidenceOk==true` when thresholds satisfied.
- Publish runbooks for manual replay, token rotation, and failure triage.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| Payload schema alignment workshop | Backend Eng + MC + Finance | 2d | None |
| GraphQL client scaffolding | Backend Eng | 2d | Workshop |
| Retry + dedupe logic | Backend Eng | 2d | Client scaffold |
| Telemetry integration | Backend Eng + SRE | 2d | Client scaffold |
| SBOM/test hash ingestion | Backend Eng | 1d | Artifact registry access |
| Metrics/dashboard setup | Backend Eng + SRE | 2d | Integration |
| Runbook creation & training | Backend Eng | 1d | Validation |

## Testing Strategy
- **Unit**: Payload schema validation, sensitive field redaction, retry limiter behavior.
- **Contract**: GraphQL mutation tests using MC sandbox to verify response handling and dedupe recognition.
- **E2E**: Rollout pipeline test ensuring evidence published within 1 minute and duplicates ignored.
- **Security**: Pen test token handling and ensure secrets never logged.

## Observability & Operations
- Metrics: `evidence_publish_latency_seconds`, `evidence_publish_retries_total`, `evidence_publish_dedupe_total`, `evidence_publish_failures_total`.
- Dashboards: Submission success rate by environment, outstanding failures, duplicate suppression trends.
- Alerts: Failure rate >5% in 10m, publish latency >60s, repeated dedupe hits (indicator of pipeline loops).

## Security & Compliance
- Store MC API token in External Secrets with rotation cadence (60 days) and audit trail.
- Mask sensitive data in logs; ensure SBOM/test hashes sanitized for PII.
- Perform threat modeling for token leakage; limit scope to publishEvidence mutation.

## Documentation & Enablement
- Update release engineering handbook with evidence submission workflow.
- Provide sample payloads and troubleshooting guide to Finance and MC stakeholders.
- Record walkthrough demonstrating metrics dashboards and replay procedure.

## Operational Readiness Checklist
- [ ] Contract tests pass against MC sandbox with signed fixtures.
- [ ] Evidence dashboards reviewed and approved by SRE and Finance.
- [ ] Runbook published, linked in rollout checklist, and acknowledged by on-call.
- [ ] Secret rotation procedure tested in staging.

## Dependencies
- MC endpoint and access token provisioned.

## Risks & Mitigations
- **Token leakage**: Use short-lived tokens, restrict scopes, audit every invocation.
- **Telemetry lag**: Cache metrics snapshots prior to rollout, retry fetch with fallback values.

## Acceptance Criteria
- Evidence appears in MC within ≤1 minute of rollout completion with correct releaseId.
- Duplicate submissions de-duplicated and logged without duplicate records.
- publishEvidence client exposes success/failure metrics and alerting hooks.
- Finance and MC stakeholders sign off on payload contents and redaction coverage.
