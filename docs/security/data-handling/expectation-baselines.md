# Data Handling: Expectation Baselines

## Data classes

- Public: published posts, public metadata
- Internal: baseline configs, evaluation outputs
- Confidential: customer-specific baselines
- Regulated: none by default

## Retention

- Evidence bundles: per governance policy (default 365d)
- Baseline versions: retain last N versions (default 20)

## Audit export

- Export evidence index + manifests + baseline diffs

## Never-log fields

- Tokens/credentials
- Any draft/private content (deny-by-default)
