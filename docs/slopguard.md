# SlopGuard Governance

SlopGuard is an anti-slop governance subsystem for the Summit platform. It detects, labels, and blocks low-quality AI-generated content ("slop") across multiple ingestion points.

## Policy

SlopGuard enforces a *deny-by-default* policy for high-risk artifacts.

### Deny Conditions

An artifact is denied if:
- It is missing required disclosure fields (`llm_assisted`, `llm_tools`, `human_verifier`).
- Its risk score exceeds the configured `deny_threshold` (default: 0.70).
- It contains hallucinated or unreachable citations (hard fail).

## Overrides

Overrides are permitted only with:
1. An explicit `override_reason`.
2. A designated `approver`.
3. An audit evidence artifact emitted to `EVD-AISLOPFT20260201-AUDIT-005`.

## Integration

SlopGuard hooks into:
- `summit/ingest/`: research artifacts (papers, reviews).
- `summit/agents/`: agent outputs.
- `summit/pipelines/datasets/`: training corpora.

## Evidence IDs

- `EVD-AISLOPFT20260201-POLICY-001`: Policy evaluation output
- `EVD-AISLOPFT20260201-DETECT-002`: Slop scoring metrics
- `EVD-AISLOPFT20260201-CIT-003`: Citation verification report
- `EVD-AISLOPFT20260201-DATA-004`: Dataset hygiene results
- `EVD-AISLOPFT20260201-AUDIT-005`: Override/audit log snapshot
