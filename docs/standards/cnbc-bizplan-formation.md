# CNBC Business Plan and Formation Readiness Standard

## Domain Mapping

| Domain | Import | Export | Non-goal |
| --- | --- | --- | --- |
| Business Plan JSON | User-provided plan payload | Validated structure and completeness score | Drafting plan content |
| Legal Structure | Enumerated choice (`sole_proprietorship`, `llc`, `corporation`) | Liability/tax risk tier mapping | Tax calculation |
| Financial Projection | Structured startup cost + projections | Deterministic readiness completeness score | Forecasting engine |

## Deterministic Controls

- Mandatory sections are enforced by `schemas/business_plan.schema.json`.
- Legal-structure normalization is enforced by `schemas/legal_structure.matrix.json`.
- Deny-by-default decisioning applies when mandatory formation fields are missing.
- Readiness scoring threshold for minimum pass is `0.70`.
