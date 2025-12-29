# Runtime Moat Advanced Capabilities

This document details the production plan for expanding the runtime moat across five capabilities: continual policy learning, dynamic KV cache sharing, hardware-aware placement, adaptive speculative depth, and streaming constrained decoding. It builds on the adaptive execution model (routing to small/large models with validation and caching) and codifies how we instrument, deploy, and safeguard each enhancement.

## Objectives

- **Lower cost-per-case while preserving quality:** Learn routing policies online and reuse compute safely.
- **Improve tail latency (p95/p99):** Hardware-aware placement, KV cache sharing, and adaptive speculation reduce contention and retries.
- **Strengthen deployability:** Edge-safe variants, schema-first outputs, and cache isolation enable constrained environments.
- **Governance & compliance:** All decisions expressed as policy-as-code; full auditability of routing, cache reuse, and validation.

## Architecture Overview

- **Policy Learning Loop:** Contextual bandit service trains/updates routing weights using live metrics (latency, cost, quality score). Exposes a policy snapshot API consumed by the router.
- **Execution Fabric:** Operator graph (extract → enrich → generate → validate) remains unchanged; new control hooks for hardware placement, speculative depth, and stream validation.
- **KV Cache Fabric:** Privacy-safe hashing + access controls for cross-request KV reuse; scoped by tenant + policy labels; tracks provenance.
- **Telemetry Plane:** Unified traces across router → cache → model → validator; live feature vectors, reward signals, and divergence metrics are persisted to the observability lake.
- **Safety & Governance Layer:** Schema validators, policy-as-code guardrails (OPA), abuse/PII redaction at ingress, and repair loops with bounded budgets.

## Capabilities

### 1) Continual Policy Learning (Contextual Bandits)

- **Approach:** Use Thompson Sampling with Bayesian linear regression (or LinUCB where prior uncertainty is high) over feature vectors capturing prompt class, schema difficulty, cache-heat, tenant SLA, and recent divergence rate.
- **Loop:**
  1. Router queries latest policy snapshot; chooses arm (small/medium/large path or specialized expert) with exploration bonus capped by tenant budget.
  2. Execution records reward tuple: `(quality_score, latency_ms, cost_tokens, validation_failures)` and emits to reward sink.
  3. Bandit trainer ingests rewards, updates posteriors, and publishes a new signed snapshot every `N` minutes with rollout percentages.
- **Data & Safety:**
  - Pseudonymous feature hashing; no raw PII stored. Tenant isolation enforced via namespace keys and OPA policies.
  - Reject snapshots failing holdout validation (quality floor, cost/latency ceilings). Keep last-known-good (LKG) snapshot in router cache.
- **Drift & Regression Controls:** Canary the new policy to ≤5% of traffic; auto-roll back on p95 or validation failure regression >2x control.
- **Interfaces:**
  - `POST /policy-snapshots` (trainer → router cache) with signature + version.
  - `GET /routing-decision` returns decision + exploration metadata for traceability.

### 2) Dynamic KV Cache Sharing (Privacy-Safe)

- **Keying:** Instruction-aware semantic hash + schema hash + tenant namespace. Include `safety_labels` and `policy_version` to prevent unsafe reuse.
- **Access Control:**
  - OPA policy evaluates whether requesting principal can reuse cached KV; denies cross-tenant by default.
  - Cache entries tagged with provenance (prompt hash, model, validator version) and TTL tuned by volatility class.
- **Storage & Eviction:**
  - Tiered: in-process (fast path) → regional distributed KV → cold object store for warm-starts.
  - Evict on validator or model version change; negative cache for known-bad prompts.
- **Observability:** Cache hit/miss, reuse origin, and validator outcomes are logged with hashed identifiers. Export counters for cross-request KV acceptance rate and rollback events.

### 3) Hardware-Aware Placement

- **Scheduler Inputs:** Live queue depth, GPU/CPU/NPU availability, per-device cost, and latency SLOs. Tags from router (e.g., `requires:gpu`, `latency:ultra-low`, `bandwidth:limited`).
- **Placement Algorithm:**
  - Scored shortlist per request: `score = w1*deadline_slack + w2*cost_efficiency + w3*cache_locality - w4*contention`.
  - Prefer nodes with existing KV cache for the same prompt family to maximize reuse.
  - Fallback to CPU/edge path when GPUs saturated while respecting quality budget.
- **Controls:** Hard SLO fences (drop/redirect when p95 projected breach); preemption rules for low-priority traffic; power-aware throttling for edge.
- **Interfaces:** Sidecar exposes `/placement-hints` to workers; scheduler emits placement decision into trace spans for audit.

### 4) Adaptive Speculative Depth

- **Signal Inputs:** Recent divergence rate, prompt class, model pair, token budget, and latency target.
- **Policy:**
  - Start with baseline draft length (e.g., 32 tokens); adjust per request: increase when divergence <5% and latency budget tight; decrease when divergence >15% or validator retries spike.
  - Clamp within `[min_depth, max_depth]` per tenant and model.
- **Safety:** Early abort on schema violation during speculation; repair via validator before continuing stream.
- **Metrics:** Track acceptance ratio, wasted tokens, and latency deltas; feed into bandit features to bias routing toward stable speculation pairs.

### 5) Streaming Constrained Decoding

- **Method:** Incremental schema validation (chunked JSON schema or protobuf validators) applied every `k` tokens; maintains partial AST with repair hints.
- **Failure Handling:**
  - On violation: invoke small repair model to patch partial output; escalate to larger model if retry budget allows.
  - If repair fails, degrade gracefully to rule-based clamps for enums/numerics and mark response as `degraded`.
- **User Experience:** Stream tokens as soon as validated; include `validation_status` metadata in server-sent events for UI.
- **Security:** Strict allowlists for URLs and identifiers; redact on stream before emitting.

## Data Flows

1. **Request Ingress:** PII redaction → feature extraction → router decision (policy snapshot).
2. **Placement & Caching:** Scheduler selects hardware; KV cache checked; speculation depth chosen.
3. **Generation Loop:** Draft/verify speculation; streaming validator enforces schema; cache writes on success.
4. **Reward Emission:** Trace IDs tie routing, placement, cache hits, and validation outcomes; rewards feed bandit trainer.

## Rollout Plan

- **Phase 0 (Shadow):** Enable telemetry-only bandit scoring; no live decisions. Validate reward pipeline and snapshot signatures.
- **Phase 1 (Canary 5%):** Enable bandit-controlled routing + adaptive speculation on a small tenant set. Monitor p95, cost per case, validation failure rate.
- **Phase 2 (Regional 30%):** Turn on hardware-aware placement + KV sharing in one region with eviction-on-violation alerts.
- **Phase 3 (Global Default):** Graduate features after two weeks of stable SLOs; keep feature flags for rapid rollback.

## Observability & SLOs

- **Metrics:** `routing_reward`, `policy_snapshot_age`, `kv_accept_rate`, `kv_rollback_count`, `placement_deviation_ms`, `spec_depth_tokens`, `spec_divergence_rate`, `stream_validation_failures`, `p95_latency`, `cost_per_case`.
- **Tracing:** Spans for router, placement, cache lookup, speculative draft/verify, validator checkpoints; attach snapshot/version IDs.
- **Alerts:**
  - p95 latency regression >15% vs control for 10m.
  - KV rollback rate >1% of requests.
  - Policy snapshot age >30m (stale) or signature mismatch.
  - Streaming validator failure rate >2%.

## Security & Compliance

- All policy logic expressed in OPA bundles; routing and KV reuse decisions are logged with hashed context IDs.
- Tenant isolation by namespace and signed snapshots; KV entries encrypted at rest and in transit.
- Privacy-safe hashing for feature vectors; no raw user text stored outside transient memory.

## Testing Strategy

- **Unit:** Bandit reward updates; snapshot signature validation; KV key construction; speculative depth clamps; streaming validator chunk checks.
- **Integration:**
  - End-to-end routing with synthetic tenants (budget tiers) verifying hardware placement and cache reuse paths.
  - Shadow/active canary toggles with rollback on alert.
  - Streaming decoding with intentional schema violations to exercise repair loop.
- **Property-Based:** Cache key stability for semantically equivalent prompts; monotonic improvement of reward under stationary conditions.
- **Perf/Load:** p50/p95/p99 latency under mixed traffic; GPU/CPU saturation scenarios; KV cache contention.
- **Fuzz/Security:** Malformed partial JSON streams; adversarial prompts targeting cross-tenant cache leakage; signature tampering on snapshots.

## Runbooks

- **Rollback:** Flip feature flags (`routing.policy_bandit`, `cache.cross_request_kv`, `placement.hw_aware`, `speculation.adaptive_depth`, `validator.streaming`) to `off`; clear KV tier; revert to LKG policy snapshot.
- **Disaster Recovery:** If policy trainer unavailable, freeze router on LKG snapshot, disable exploration, and route only via deterministic rules.
- **Audit:** Query provenance ledger by `trace_id` to reconstruct routing, placement, cache decisions, and validator outcomes.

## Future Enhancements

- Graph-based policy features incorporating entity/link density to refine routing decisions.
- Differentially private aggregation for reward signals to further reduce leakage risk.
- RLHF-style offline batch updates combined with online bandits for faster convergence.
- Cross-model KV compatibility layer using tokenizer-agnostic compression for heterogeneous fleets.
