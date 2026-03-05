# Copilot Usage Metrics API Update (2026-02-19): Summit Subsumption Plan

## Summit Readiness Assertion

This update is treated as a readiness accelerator, not an optional analytics enhancement. The new
Copilot delivery-impact metrics (`pull_request_throughput`, `time_to_merge`) are adopted as
governed evidence inputs for Foundation and Innovation lanes.

## Present-State Position

GitHub Copilot Usage Metrics API now includes delivery performance signals:

- `pull_request_throughput`: merged PR volume over bounded windows.
- `time_to_merge`: open-to-merge latency, suitable for median/p95 tracking.

The integration target is to convert AI usage telemetry into delivery-effect telemetry with
policy-bound evidence.

## Foundation + Innovation Subsumption Lanes

### Lane A — Foundation (Deterministic Ingestion)

1. Extend ingestion contract with strongly typed metric families:
   - `copilot_usage` (existing)
   - `copilot_delivery_impact` (new)
2. Enforce date-range normalization and scope hierarchy (`org`, `team`, `repo`).
3. Persist raw payload snapshots for audit replay and schema drift detection.
4. Emit deterministic derived aggregates: weekly throughput and p50/p95 merge latency.

### Lane B — Innovation (ROI and Operational Decisions)

1. Join Copilot delivery-impact signals with internal release telemetry.
2. Add Copilot ROI scorecards that compare adoption cohorts vs control cohorts.
3. Trigger review-efficiency alerts when `time_to_merge` regresses despite steady usage.
4. Feed executive dashboards with governed, reproducible trendlines.

## Proposed Ingestion Schema Delta

```json
{
  "copilot_delivery_impact": {
    "scope": {
      "level": "org|team|repo",
      "org": "string",
      "team": "string|null",
      "repo": "string|null"
    },
    "window": {
      "start": "ISO8601",
      "end": "ISO8601",
      "granularity": "day|week|month"
    },
    "pull_request_throughput": {
      "merged_pr_count": "number"
    },
    "time_to_merge": {
      "median_hours": "number",
      "p90_hours": "number|null",
      "p95_hours": "number|null"
    },
    "source": {
      "provider": "github",
      "api": "copilot-usage-metrics",
      "api_version": "string"
    }
  }
}
```

## Governance and Evidence Model

- Treat the new fields as **delivery-impact metrics** with release-governance relevance.
- Record each ingestion run with:
  - schema version
  - retrieval timestamp
  - source scope and window
  - transformation checksum
- Store evidence bundles to support:
  - AI governance audits
  - executive ROI reviews
  - GA gate verification

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers**: Data, Agents, Observability, Security.
- **Threats Considered**:
  - telemetry poisoning via malformed scope/window filters
  - false ROI claims from inconsistent aggregation windows
  - unauthorized access to organization-level productivity metrics
- **Mitigations**:
  - strict schema validation and reject-on-drift behavior
  - canonical windowing and normalization before aggregation
  - scoped access controls and immutable audit logs for metric fetch + transform operations

## Decision, Confidence, and Rollback

- **Decision rationale**: adopt now to shorten feedback loops between AI adoption and delivery
  outcomes while preserving evidence quality.
- **Confidence**: 0.84 (high confidence on contract shape; medium confidence on final percentile
  availability per tenant scope).
- **Rollback triggers**:
  - repeated schema mismatch for 3 consecutive collection windows
  - governance gate failure on evidence completeness
  - material discrepancy between Copilot API metrics and internal PR telemetry
- **Rollback steps**:
  1. disable `copilot_delivery_impact` downstream joins,
  2. continue collecting raw snapshots only,
  3. re-run schema conformance against latest API contract,
  4. restore joins after deterministic reconciliation.

## Post-Deploy Accountability Window

- **Window**: 14 days after enabling ingestion.
- **Metrics to watch**:
  - collection success rate
  - schema drift incidents
  - dashboard freshness SLA
  - variance between external and internal throughput/merge-time metrics

## Tradeoff Ledger Entry Requirement

Any downstream decision that changes staffing, process gates, or budget based on these metrics must
append a rationale record in `governance/tradeoffs/tradeoff_ledger.jsonl` with explicit
cost/risk/velocity tradeoffs.
