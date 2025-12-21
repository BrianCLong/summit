# NL→Cypher Preview Specification

## Feature Overview
Analysts draft NL prompts and receive policy-aligned Cypher previews with explainability before executing queries in the tri-pane workflow.

## User Stories
- As an analyst, I want top-3 Cypher candidates with rationale so I can pick the safest option.
- As a reviewer, I want exportable verification results for R2/R3 demos showing preview accuracy and policy compliance.

## API Contract (Preview Service)
- **Endpoint:** `POST /preview/v1/nl-to-cypher`
- **Request:** `{ queryText, actorId, tenantId, context: { timeframe, focusNodes[] }, traceId }`
- **Response:**
  ```json
  {
    "candidates": [
      {
        "cypher": "MATCH ...",
        "confidence": 0.91,
        "policiesApplied": ["POL-12", "POL-44"],
        "explain": "POL-12 enforces analyst scope; POL-44 blocks unsafe predicate",
        "kpis": { "latencyMs": 320, "policyHits": 2 },
        "verification": { "hash": "...", "bundleId": "r2-demo-01" }
      }
    ],
    "telemetry": { "traceId": "...", "cache": "MISS" }
  }
  ```
- **Error Cases:** `400` invalid request, `403` policy violation, `429` guardrail depth/unsafe verb, `500` system.

## Runtimes & Dependencies
- Node.js preview service calling authority compiler and Neo4j sandbox (read-only) using seeded schema from demo data.
- Policy registry client for enforcement and explanation linking.
- Provenance ledger client for writing preview traces (event type `preview.generated`).

## KPIs & Observability
- Latency: median <400 ms, P95 <850 ms with demo fixtures.
- Accuracy: ≥95% precision on curated set; stored in verification bundle for demos.
- Error budget: <=2% preview failure rate excluding guardrail blocks.
- Metrics: `preview_latency_ms`, `preview_guardrail_blocks_total`, `preview_accuracy_ratio` with tenant labels.
- Logs: structured JSON with `traceId`, `actorId`, `policyVersion`, `candidateCount`.

## UX Requirements
- Tri-pane view shows NL input, Cypher preview, and policy explanation side-by-side.
- `Explain this view` affordance surfaces policy hits and recommended mitigations.
- Export button writes verification results (KPIs, selected candidate hash) to provenance ledger and allows download for R2/R3.
