# Sprint 9 Plan

## Goals
- Deliver Deepfake Detector v1 with human-in-the-loop (HITL) triage.
- Ship Entity Resolution v2 with merge suggestions, provenance, and reversible merges.
- Ensure compliance and observability for new features.

## Scope
- ONNX-based detector plugin interface with checksum verification.
- Quarantine queue and reviewer UI with audit logging.
- Entity Resolution merge suggestions and provenance ledger.
- DSAR purge tooling and Splunk exports.

## Non-Goals
- Heavy model training or GPU-dependent deployment.
- Automated de-quarantine without human review.
- Full production hardening of detector models.

## Timeline
- **Week 1:** detector integration, quarantine flow, ER suggestions.
- **Week 2:** reviewer UI, provenance ledger, compliance scripts, dashboards.

## Ceremonies
- Daily stand-up, sprint review, retrospective.
- Pairing sessions for security and compliance items.

## Definition of Done
- Tests passing and lint clean.
- Detector quarantines suspicious media and requires review.
- ER merges are reversible with provenance records.
- Documentation, dashboards, and Splunk searches updated.

## Backlog
| ID | Title | Type | Acceptance Criteria | Owner |
|----|-------|------|--------------------|-------|
| S9-1 | Deepfake detector plugin | Story | Detector loads ONNX model, verifies checksum, returns banded score. | ML |
| S9-2 | Quarantine queue | Story | Uploads flagged as non-low band are quarantined and logged. | BE |
| S9-3 | Review UI & audit | Story | Reviewer can approve/reject; decisions recorded with DLP masking. | FE |
| S9-4 | ER suggest/merge/revert | Story | Service returns suggestions, merges with provenance, supports revert. | BE |
| S9-5 | DSAR purge | Story | Script removes derived features and logs provenance. | Ops |
| S9-6 | Dashboards | Story | HITL and ER metrics visible in Grafana. | Ops |
| S9-7 | Quarantine bypass cannot write | Bug | Policy denies writes from quarantined media. | BE |
| S9-8 | Revert fails without provenance | Bug | Reverts require provenance record, otherwise error. | BE |
