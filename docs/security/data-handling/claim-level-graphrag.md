# Data Handling — claim-level-graphrag

## Data classes
- **Claims:** Public/Internal. No PII.
- **Evidence:** Public/Internal. References to existing graph nodes.

## Never-log fields
- Raw prompts sent to LLM.
- User PII.
- Full text of source documents (use hashed references or IDs).

## Retention defaults
- Evidence bundles: 90 days in non-prod.
- Production logs: 1 year.

## Audit export format
- JSON evidence bundles (`report.json`, `metrics.json`, `stamp.json`) are generated for every run.
