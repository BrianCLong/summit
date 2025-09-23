# Sprint 8 Plan

## Goals
- Operationalize media authenticity checks.
- Harden GraphRAG operations and observability.
- Improve compliance and export flows.

## Scope
- Media precheck service with strict MIME allowlist.
- GraphQL contract extensions for authenticity fields.
- GraphRAG retries, timeouts and metrics.
- Splunk exporter with PII-off default.

## Non-Goals
- Heavy deepfake detection models (deferred to Sprint 9).

## Timeline
- **Week 1**: Services & GraphQL integration.
- **Week 2**: Client surfaces, docs and observability.

## Ceremonies
- Daily stand-up
- Mid-sprint review
- Sprint demo & retrospective

## Definition of Done
- Tests passing and audit logs show redacted features.
- `npm run test:smoke` green.
- `make sprint8` produces gh command hints.

## Backlog
| Issue | Acceptance Criteria |
|-------|--------------------|
| Media precheck | Quarantines unsupported or flagged media |
| GraphQL threat schema | Returns authenticity fields |
| GraphRAG hardening | Retries and metrics observed |
| Splunk exporter | Sanitizes events by default |
