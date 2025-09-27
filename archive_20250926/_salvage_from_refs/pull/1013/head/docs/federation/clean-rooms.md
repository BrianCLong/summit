# Federated Clean Rooms

Federated Clean Rooms enable cross-tenant analysis while preserving data residency and privacy.

## Manifests
- Each session is defined by a signed manifest listing tenants, datasets, allowed persisted queries, retention and PII-off flag.
- Manifests are stored under `config/cleanrooms/` and referenced by id.

## Residency & DLP
- Requests pass through OPA policy `cleanrooms.rego` enforcing region residency and DLP masks.
- Outputs default to aggregates with PII stripped unless `piiOff` is false.

## DSAR Propagation
- All access is audited; DSAR requests propagate to participating tenants via manifest metadata.
- Exported data includes minimal lineage info to trace origin.
