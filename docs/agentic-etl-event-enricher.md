# Agentic ETL / Event Enricher Pilot

## Objective

Stand up an operational agent layer that can replace segments of production data pipelines with event-native AI, sustaining weeks of stable uptime without paging while enriching streaming signals with graph-aware context.

## Scope & Use Cases

- **Ingestion surfaces:** Kafka-compatible topics (Confluent, Redpanda), HTTP webhooks, and optional S3 drop folders converted into events.
- **Agentic functions:**
  - Entity normalization and deduplication against IntelGraph schemas.
  - OSINT enrichment (domain/IP/org/geo/reputation), with provenance captured for every attribute.
  - Risk and narrative tagging projected into IntelGraph (risk scores, threat narratives, kill-chain stage, confidence).
- **Outputs:** Immutable event log + IntelGraph projections + audit trail.

## Architecture Overview

- **Event fabric:** Confluent (or MSK/Redpanda) with CDC-like topic contracts. Backpressure handled with consumer lag alarms and adaptive concurrency (max in-flight per partition).
- **Workcell pattern:** Stateless agent workers consume events → perform normalization/enrichment → emit enriched events and graph mutations.
- **Graph projection:** IntelGraph updater builds/updates entities/edges and attaches tags/risk scores. Writes are idempotent and versioned.
- **Deterministic fallback path:** A conventional ETL lane (schema mapping + deterministic enrichment) can be toggled per routing policy for high-importance flows.
- **Control plane:** Policy service routes events to agentic vs deterministic lanes; cost guardrails throttle/shape workloads; provenance ledger stores decisions.

## Data & Control Flows

1. **Ingress:**
   - Kafka consumer group `agentic-etl` with static partitions; webhook ingress buffers into a durable topic.
   - Optional S3 drop monitored by a lightweight connector that publishes object metadata events.
2. **Normalization:**
   - Schema registry validates envelopes; agent normalizes identifiers (emails, domains, IPs, entity IDs) and maps to IntelGraph node types.
3. **Enrichment:**
   - OSINT adapters (DNS/WHOIS, passive DNS, cert transparency, GeoIP, reputation) invoked with cost-aware budgets.
   - Deduping performed before OSINT calls using MinHash-style similarity to avoid redundant lookups.
4. **Risk & Narratives:**
   - Risk scoring blends deterministic heuristics + LLM rationale; narratives templated to keep token costs bounded.
   - All risk outputs include `confidence` and `evidence` fields and are logged to provenance ledger.
5. **Emission:**
   - Enriched event + provenance to event log; graph mutations via IntelGraph updater; metrics/traces/logs emitted per span.

## Guardrails

- **Cost:**
  - Per-tenant and per-connector budgets; circuit breakers disable optional OSINT providers when spend thresholds trip.
  - Token-aware prompting with hard ceilings; prefer retrieval + templates over free-form generation.
- **Reliability & Failure Modes:**
  - Backpressure: consumer lag SLOs, pause/resume per partition, dead-letter topics for poison pills.
  - Fallback: deterministic lane auto-routes high-importance flows (policy tag `priority:high`) or on repeated agent failures.
  - Timeout + retry policies tuned per provider; exponential backoff with jitter; idempotent writes keyed by event hash.
- **Safety & Compliance:**
  - PII filters before OSINT calls; policy-as-code governs which attributes can be externalized.
  - Provenance ledger logs prompts, responses, costs, and decision rationales.

## Success Metrics

- **Enrichment coverage:** % events with normalized entities + OSINT attributes vs curated baseline.
- **Accuracy:** Precision/recall of risk tags and entity linking against labeled test set.
- **Stability:**
  - Latency SLO: p95 end-to-end enrichment < 2.5s on steady state.
  - Uptime: no critical pages across rolling 30-day pilot.
  - Cost: spend within defined per-tenant envelopes; zero surprise spend incidents.
- **Operational efficiency:** ≥40% reduction in human data-wrangling effort (tickets/time logged) for covered flows.

## Rollout Plan

- **Phase 0 (Design/Bench):** Finalize schemas/contracts; replay historical topics to tune prompts and deterministic heuristics.
- **Phase 1 (Shadow):** Run agents in shadow mode vs deterministic lane; measure drift and cost.
- **Phase 2 (Partial Cutover):** Enable agentic lane for low/medium importance; keep high-importance on deterministic fallback.
- **Phase 3 (Adaptive):** Dynamic lane selection per policy; auto-throttle OSINT calls under budget pressure.
- **Phase 4 (Harden):** Chaos tests (paused partitions, provider failures); finalize SLO dashboards and alerting.

## Observability

- Metrics: consumer lag, in-flight requests, OSINT call latency/error, cost per event, enrichment coverage, risk-tag precision.
- Tracing: spans for ingest → normalize → enrich → graph update; include cost + retry metadata.
- Logging: structured logs with event hash, lane, outcome, and provenance pointers; dead-letter logs with root-cause tags.

## Innovation Track

- Introduce a **graph + streaming co-processor** that pre-computes candidate entity links using incremental graph embeddings and feeds them to the agent as hints, reducing token usage and improving normalization recall.
