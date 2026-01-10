# Disclosure Transforms (PQLA)

## Supported Transforms

- Aggregation (grouping, summarization).
- Redaction of direct identifiers.
- k-anonymity enforcement.
- Differential privacy noise injection.
- Suppression of low-count buckets.

## Transformation Workflow

1. Apply policy-defined disclosure constraints.
2. Generate a transformation report with parameters.
3. Emit a compliance artifact with commitments to both pre- and post-transform summaries.

## Metrics

- Information loss score.
- Suppression counts.
- Noise budget usage.
