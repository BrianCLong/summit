# Data Handling - Coordination Evaluation

## Prohibited Logging

- Raw prompts.
- PII fields in coordination traces.
- Unhashed context payloads.

## Required Controls

- Every event must include `evidence_id`.
- Context sharing uses deterministic hash-only propagation.
- Coordination metrics retention target is 30 days.
