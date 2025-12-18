# Prompt 7: Metrics & Observability Skeleton for Product & Governance KPIs

**Tier:** 1 - Platform Services
**Priority:** ⭐️ HIGH PRIORITY
**Effort:** 1 week
**Dependencies:** Prompts 1, 2
**Blocks:** Prompts 6, 8, 10
**Parallelizable:** Yes (with Prompts 3, 4)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- We have defined key KPIs (product, business, governance).
- We need a minimal observability layer that:
  - defines metrics,
  - exposes them via an endpoint,
  - records them with provenance where appropriate.

Goal:
Create a small metrics module + HTTP endpoint that services can use to emit and expose Topicality KPIs.

Assumptions:
- Use TypeScript/Node or Python.
- Assume integration with a metrics system (e.g., Prometheus) but you can stub actual exports.

Requirements:
1. KPI definitions
   - Product KPIs:
     - time_to_first_value_days,
     - provenance_manifest_coverage,
     - p95_query_latency_ms,
     - reliability_slo_uptime.
   - Business KPIs:
     - design_partners_signed,
     - payback_period_months,
     - gross_margin_pct.
   - Governance KPIs:
     - sbom_and_attestation_per_release,
     - policy_violation_rate,
     - disclosure_pack_adoption.

2. Metrics module
   - Provide functions to record these metrics with:
     - value,
     - timestamp,
     - dimensions (e.g., tenant, service, environment).
   - Store in memory or lightweight store for now.
   - Optionally log metric events with a claim ledger manifest stub.

3. HTTP endpoint
   - `/metrics` or similar:
     - returns metrics in a scrape-friendly format (e.g., Prometheus text or JSON).
   - Ensure minimal auth for now, but structure so ABAC could be applied later.

4. Tests & docs
   - Unit tests for recording and exposing metrics.
   - README explaining:
     - metric naming conventions,
     - how to integrate from another service,
     - how this would plug into a real monitoring system.

Deliverables:
- Metrics library.
- Example service exposing `/metrics`.
- Tests and README.
