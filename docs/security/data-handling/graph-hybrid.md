# Data Handling: Graph+Vector Hybrid Retrieval

## Data Classes

- Public
- Internal
- Confidential
- Regulated

## Never-Log Fields

- Raw embeddings
- Secrets or credentials
- PII fields (explicitly identified per tenant policy)

## Retention Defaults

- Retrieval traces: 30 days
- Evidence bundles: per GA retention policy

## Audit Exports

- Evidence bundle (report/metrics/stamp)
- Retrieval trace exports (JSONL)

## Tenant and Residency Considerations

- Tenant scoping required for every retrieval request.
- Residency policies enforced via deny-by-default gates.
