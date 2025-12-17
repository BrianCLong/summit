# Digital Triplet Delivery Blueprint

## 1. Architecture Overview
- **Edge/P-layer:** TPM-backed device identity; QUIC/MQTT gateways; wasm filters for schema validation and adaptive sampling.
- **Data/Graph Plane:**
  - Context Graph (CRDT + trust scores) for entity/goal/policy linking with provenance ledgering.
  - Timeseries store for hot telemetry; columnar lakehouse (Iceberg/Delta) for replay; vector store for semantic recall.
  - Event fabric (NATS/Redpanda) for intent propagation, agent coordination, and policy broadcast.
- **Simulation & Digital Layer:** Multi-fidelity simulators (surrogate + high-fidelity) orchestrated by workload broker; shadow-state mirrors with time-travel snapshots; ontology and causal services for SCM queries.
- **Cognitive Layer:** Agent mesh (Sentinel, Planner, Operator, Ethics/Compliance, Curator) with credit assignment; Ray/KubeFlow-backed training/evaluation; per-intent microVM/wasm sandboxes for isolation.
- **Governance & Safety:** OPA/Rego safety lattice; provenance ledger (in-toto/Sigstore signing); kill-switches, leases, and rollback playbooks; divergence monitors and quarantine queues.
- **Moat Layer:** Adversarial divergence sentinel, chained provenance attestation per control tick, and antifragility scoring that routes stress-derived improvements into controlled playbooks.
- **Interfaces:** gRPC/GraphQL APIs for state/action; gRPC interceptors for policy checks; operator console for intent authoring, what-if visualizations, and rollback orchestration.

```
[Physical Edge] --signed telemetry--> [Ingestion Gateways] --validated events--> [Context Graph + TSDB + Lakehouse]
      |                                                                  |
      |<-- leased commands / rollbacks -- [Governance Lattice + Agent Mesh + Simulators] --<-- causal forecasts
```

## 2. Data Models & Schemas
- **Telemetry Envelope (protobuf/sketch):**
  - `device_id`, `attestation_token`, `timestamp`, `signal[] { name, value, unit, quality_score }`, `schema_version`, `signature`.
- **Context Graph Nodes:** `Asset`, `Sensor`, `Actuator`, `Goal`, `Policy`, `Hazard`, `Playbook`, `Intent`, `Agent`, `SimulationRun`.
- **Context Graph Edges:** `OBSERVES`, `CONTROLS`, `SATISFIES`, `VIOLATES`, `DEPENDS_ON`, `DERIVED_FROM`, `BLOCKED_BY`, `CERTIFIED_BY`, `HAS_ROLLBACK` with weights: `trust`, `recency`, `confidence`, `divergence_score`.
- **Ledger Entry:** `{id, actor, action, inputs, outputs, hash, signature, causality_links[], rollback_hook, intent_scope, policy_version, timestamp}`.

## 3. API Surface (representative)
- **gRPC Services:**
  - `TelemetryIngest.Push(stream TelemetryEnvelope)`
  - `StateGraph.Query(GraphQueryRequest) -> GraphQueryResponse`
  - `Simulation.Run(SimulationRequest) -> SimulationHandle`
  - `Intent.Submit(IntentSpec) -> IntentReceipt`
  - `Governance.Evaluate(ActionBundle) -> Decision` (OPA-backed)
  - `Actuation.Dispatch(ActionBundle) -> DispatchResult`
- **Event Topics:**
  - `telemetry.raw`, `telemetry.validated`, `contextGraph.delta`, `agent.intent`, `agent.decision`, `governance.alert`, `rollback.command`, `quarantine.notice`.
- **Policy Interfaces:** Rego packages scoped by domain (`ethics`, `compliance`, `mission`); signed policy bundles with version gates.

## 4. Workflows & Feedback Loops
1. Telemetry ingestion → schema/attestation validation → CRDT merge → context graph update → provenance ledger append.
2. Sentinel detects drift → raises `governance.alert` → Planner spawns simulations → Operator prepares action bundles with rollback hooks.
3. Governance lattice scores bundles → approved actions dispatched with leases → receipts logged → monitors watch divergence budgets → auto-rollback if thresholds exceeded.
4. Post-action learning: outcomes scored against forecasts; trust weights adjusted; simulators re-calibrated; policies version-bumped if needed.

## 5. Deployment & Ops
- **Runtime:** Kubernetes (real-time extensions), namespaced per-domain; Firecracker microVMs for high-assurance agents; wasm sandboxes for lightweight filters.
- **Networking:** mTLS everywhere; SPIFFE/SPIRE identity; per-intent network policies; service mesh with intent ID propagation.
- **Storage:** Encrypted at rest; envelope encryption for sensitive signals; KMS-backed key rotation; least-privilege data access via attribute-based controls.
- **Rollouts:** Blue/green + canary; staged actuation (sim-only → shadow → constrained live); automatic rollback on lattice violation or divergence budget breach.
- **Disaster Recovery:** Snapshot + ledger replay; verified restore drills; isolated recovery environment; offline/manual kill-switch runbooks.

## 6. Observability & SLOs
- **Tracing:** OpenTelemetry with intent IDs; spans for ingestion, graph merge, simulation, governance, dispatch, and actuation.
- **Metrics:** latency (p50/p95/p99) per loop, approval/veto rates, rollback triggers, simulator fidelity error, quarantine counts, SBOM/signature verification success rate.
- **Logging:** Structured JSON with privacy redaction; Sigstore signing; retention tiers (hot/warm/cold) with policy-aligned retention windows.
- **SLO Baseline:**
  - Sensor-to-action p99 ≤ 250 ms (fast path), ≤ 3 s (deliberative path).
  - ≥ 99% policy bundle verification success.
  - Drift detection MTTD ≤ 30 s; rollback MTTR ≤ 60 s for critical intents.

## 7. Security & Compliance
- Supply-chain integrity (in-toto attestations, SLSA provenance, SBOMs per artifact).
- Continuous vulnerability scanning (containers, wasm modules); cosign signing and verification on admission.
- Attribute-based access control for operators; dual-control for hazardous actuations; tamper-evident logs.
- Privacy budgets for cross-organization federation; differential privacy on sensitive aggregates; domain-specific retention.

## 8. CI/CD Pipeline (reference)
- **Stages:** lint → format → unit → integration (sim + agent) → policy tests (Rego) → security scan → SBOM → signature → deploy-to-staging → synthetic tripwire tests → gated prod deploy.
- **Gates:**
  - Policy tests must pass; SBOM must be generated and signed.
  - Divergence simulation pack must stay under risk budget.
  - Canary bake time with live divergence monitors before full rollout.

## 9. Testing Strategy
- **Unit:** deterministic tests for filters, adapters, schema validation, ontology services.
- **Integration:** end-to-end ingestion → graph merge → simulation → governance → actuation in sandbox.
- **Property-based:** CRDT merge associativity/commutativity/idempotence; policy evaluation monotonicity; rollback reversibility.
- **Fuzz:** malformed telemetry envelopes; adversarial intents; simulator output perturbations.
- **Performance:** latency envelopes for fast vs. deliberative loops; soak tests for event fabric and graph writes.
- **Reliability:** chaos drills (sensor outage, clock skew, network partitions, simulator crash) with automatic recovery scoring.

## 10. Reference Components (tech choices)
- **Edge:** Rust collectors, wasm filters (WASI), TPM identity, QUIC/MQTT.
- **Data/Graph:** Redpanda/Kafka, Timescale/Influx, Iceberg/Delta Lake, Neo4j/JanusGraph, pgvector/Weaviate, CRDT library (Yjs/Automerge) with trust-weight extension.
- **Compute:** Kubernetes + KEDA, Ray/KubeFlow, Firecracker/Cloud Hypervisor, Envoy/Linkerd with SPIFFE.
- **AI/Reasoning:** RLlib, DoWhy/Ananke for causal, Z3/Prolog for symbolic constraints, LLM adapters with policy-aware tool use.
- **Governance:** OPA/Rego, in-toto/Sigstore, Notation/cosign; policy bundle distribution via OCI registry.

## 11. Operational Runbooks
- **Kill-switch:** hardware relay + software circuit breaker triggered by governance alerts; out-of-band manual override documented with dual-control sign-off.
- **Rollback:** per-intent reversible playbooks with state snapshots; automatic invocation on divergence budget breach; verification of restoration via ledger diff.
- **Key rotation:** scheduled KMS rotation with staged rollout; agent sandboxes re-attest post-rotation.
- **Incident response:** classification matrix; forensic replay via ledger; containment via quarantine queues and network isolation.

## 12. Innovation & Forward-Leaning Enhancements
- **Adaptive intent markets:** market-based arbitration for competing intents across organizational boundaries with privacy budgets.
- **Self-tuning fidelity:** automated selection of simulator fidelity based on real-time uncertainty and cost envelopes.
- **Intent-aware routing:** service mesh routes prioritized by intent criticality and risk class to maintain latency SLOs.
- **Semantic delta-sync:** ontology-aware diffing to minimize bandwidth while preserving causal traceability.

## 13. Roadmap (phased)
- **Phase 0:** Stand up ingestion, schema registry, and context graph with CRDT merge; baseline observability and signing.
- **Phase 1:** Integrate simulators with shadow state; deploy Sentinel and Planner agents; enable governance lattice with policy bundles.
- **Phase 2:** Add Operator agents with rollback contracts; enable canary actuation and divergence monitors; launch operator console.
- **Phase 3:** Federation across sites with privacy budgets; intent market prototype; neuromorphic reflex pilot where hardware exists.
- **Phase 4:** Formal verification of playbooks; cross-domain coordination; continuous certification pipeline.

## 14. Reference Implementation Layout
```
digital-triplet/
├── edge/
│   ├── collectors/ (Rust/WASM attested collectors)
│   ├── filters/ (schema + privacy filters)
│   └── configs/
├── platform/
│   ├── graph/ (CRDT merge service, ontology API)
│   ├── timeseries/ (ingest + retention controllers)
│   ├── ledger/ (provenance + signatures)
│   └── api/ (gRPC/GraphQL + policy interceptors)
├── simulators/
│   ├── surrogate/
│   └── high-fidelity/
├── agents/
│   ├── sentinel/
│   ├── planner/
│   ├── operator/
│   └── ethics/
├── policies/ (Rego bundles, safety lattice)
├── ops/ (helm charts, K8s manifests, kustomize overlays)
├── tests/ (unit, integration, property, fuzz)
└── tools/ (CLI, load-gen, chaos packs)
```

## 15. Canonical Config Snippets
- **OPA/Rego safety lattice (excerpt):**
```rego
package lattice.actuation

default allow := false

allow {
  input.intent.scope != "prohibited"
  input.action.lease_ms <= 60000
  not high_risk_without_two_person_rule
  aligned_with_objectives
}

high_risk_without_two_person_rule {
  input.action.risk_class == "critical"
  count(input.action.approvers) < 2
}

aligned_with_objectives {
  intent := data.objectives[input.intent.id]
  intent.compliance == "approved"
}
```
- **Telemetry envelope (protobuf sketch):**
```proto
message TelemetryEnvelope {
  string device_id = 1;
  bytes attestation_token = 2;
  int64 timestamp_ns = 3;
  repeated Signal signal = 4;
  string schema_version = 5;
  bytes signature = 6;
}

message Signal {
  string name = 1;
  double value = 2;
  string unit = 3;
  float quality_score = 4;
}
```
- **Agent contract (YAML sketch):**
```yaml
agent: planner-v2
autonomy_budget: medium
latency_class: deliberative
tools: [simulator:high, causal_scorer, graph.query]
forbidden_domains: [safety-critical-actuation]
max_parallel_tasks: 4
rollout: canary
```

## 16. Deployment Blueprints
- **Kubernetes (excerpt):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: context-graph
spec:
  replicas: 3
  template:
    spec:
      serviceAccountName: graph-sa
      containers:
        - name: graph
          image: ghcr.io/org/dts-graph:1.0.0
          args: ["--crdt", "--trust-merge"]
          env:
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
          resources:
            requests: {cpu: "1", memory: "2Gi"}
            limits: {cpu: "4", memory: "8Gi"}
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
```
- **Helm overlay notes:** separate values for latency classes (fast vs deliberative), intent-aware network policies, and cosign verification on admission.

## 17. Test Harnesses
- **Unit:** schema validation, CRDT merge lawfulness, Rego policy evaluation, ledger signature verification.
- **Integration:**
  - Ingestion → graph → simulator → governance → actuation loop in ephemeral namespace.
  - Shadow vs live comparison harness with differential metrics exported to Prometheus.
- **Property-based:** CRDT associativity/idempotence; causal path constraints (no cycles through prohibited domains); governance monotonicity (tightening policy cannot increase approvals).
- **Fuzz:** adversarial telemetry (type, range, timing), agent tool-call storms, simulator perturbations.
- **Performance:** soak tests for event fabric, p99 latency probes per loop, storage IO under churn.
- **Resilience:** chaos experiments for partition, clock skew, simulator crash, agent misbehavior with expected quarantine/rollback.

## 18. CI/CD Supply Chain Controls
- **Pipelines:**
  - `lint` → `format` → `unit` → `integration` → `rego test` → `sbom` → `sign` → `deploy:staging` → `synthetic` → `canary:prod`.
  - Sigstore/cosign verification on admission; SLSA provenance generation after builds; attestations stored in provenance ledger.
- **Gates:** SBOM must cover edge, platform, agents, and simulators; failed signature verification blocks promotion; divergence simulation pack must stay under risk budget.
- **Release artifacts:** OCI bundles for policies, Helm charts, simulator images, agent sandboxes, and test packs.

## 19. Post-merge Validation & Ops Checks
- **Automated:** synthetic sensor→action playbook, rollback drill, policy regression, simulator sanity drift check, provenance ledger integrity scan.
- **Manual (if critical domain):** two-person review of high-risk intents, dry-run actuation in shadow, operator console sign-off with proof capture.
- **Readiness checklist:** observability SLOs green, quarantine queue empty or explained, certification statuses current, backup snapshot <24h old.

## 20. Topology Patterns
- **Edge-dominant:** heavy reflex at edge micro-clusters; cloud layer primarily governance and long-horizon planning; used for low-connectivity or safety-critical plants.
- **Cloud-dominant:** centralized simulators and agents; edge collectors thin; optimal for high-bandwidth, multi-site coordination.
- **Hybrid burst:** steady-state edge reflex with elastic cloud deliberation; auto-burst simulators on demand with budget caps.
- **Federated mesh:** multiple orgs/sites exchanging privacy-preserving summaries; local autonomy enforced, federation rules via intent contracts.

## 21. Data Lifecycle & Retention
- **Ingestion → Hot (TSDB) → Warm (lakehouse) → Cold (archive)** with policy-based downsampling and anonymization for sensitive lanes.
- **Retention tiers:** per-domain defaults (e.g., safety-critical 3y ledger, standard 1y, debug 30d); DP noise added before federation export.
- **Deletion:** cryptographic erase for keyed data; tombstones propagated through context graph; proofs of deletion appended to ledger.

## 22. Agent Operations & Tooling
- **Agent catalog:** versioned manifests stored with SBOMs; includes autonomy budget, allowed tools, forbidden domains, latency class.
- **Runtime hooks:** structured rationale capture, counterfactual traces, attestation checks per dispatch, autonomy downgrade on regret threshold breach.
- **Tool sandboxing:** policy-aware tool routing; wasm/microVM isolation; input/output filters enforced by Rego sidecars.
- **Scorecards:** per-agent reliability, fidelity lift, veto rate, and rationale completeness; failing KPIs trigger certification refresh.

## 23. Operator Console & Dashboards
- **Views:** intent cockpit, causal explorer, divergence wall, SBOM/signature health, agent scorecards, simulator fidelity tracker.
- **Actions:** submit/veto intents, approve playbooks, initiate rollback, request simulation bundle, quarantine/unquarantine assets, re-certify agents.
- **Analytics:** forecast vs actual, ROI ledger, carbon cost per intent, blast-radius visualization for pending rollouts.

## 24. Reference Payloads
- **Intent submission (JSON sketch):**
```json
{
  "intent_id": "grid-balance-q1",
  "scope": "region-west",
  "objective": {"type": "stability", "target": 60.0, "unit": "Hz"},
  "risk_budget": {"class": "critical", "max_regret": 0.03},
  "constraints": ["two_person_rule", "no_blackout"],
  "validity": {"ttl_ms": 3600000},
  "approvers": ["ops1", "ops2"],
  "rollback_hook": "ledger://rollbacks/grid-balance-q1"
}
```
- **Action bundle (JSON sketch):**
```json
{
  "intent_id": "grid-balance-q1",
  "actions": [
    {"type": "dispatch", "target": "substation-12", "command": "set_tap", "value": -2, "lease_ms": 30000}
  ],
  "expected_impact": {"delta_hz": -0.04, "confidence": 0.91},
  "rationale": {"causal_path": ["load-forecast", "frequency"], "salient_signals": ["ts:freq", "ts:load"]},
  "rollback": {"hook": "ledger://rollbacks/grid-balance-q1", "ttl_ms": 600000},
  "policy_version": "lattice-2025-10-01",
  "signatures": ["cosign://bundle/abc"],
  "attestation": "spiffe://agent/planner-v2"
}
```

## 25. Capacity & Cost Modeling
- **Workload classes:** fast reflex (p99 ≤250 ms), deliberative (≤3 s), batch training/simulation (minutes+).
- **Inputs:** telemetry volume, simulator fidelity mix, agent fan-out, federation export rate.
- **Outputs:** per-class CPU/GPU budgets, bandwidth envelopes, storage growth curves, carbon cost estimates, risk budget consumption.
- **Budget enforcement:** scheduler rejects workload bursts exceeding intent budget; autoscaling guided by latency SLO and blast radius.

## 26. Compliance & Governance Ops
- **Policy packs:** per-jurisdiction bundles (ethics, privacy, safety) with signed versions; change control requires proof of impact analysis and targeted regression pack.
- **Evidence handling:** DPIA/PIA templates auto-populated from provenance ledger; export controls enforced via federation gateway filters.
- **Review cadence:** quarterly safety case refresh, monthly SBOM drift audit, weekly chaos drills summary appended to ledger.

## 27. Reliability & Chaos Protocols
- **Planned chaos:** clock skew injection, partial partition, simulator crash, attestation failure, agent misbehavior; expected outcome = quarantine + rollback + alert.
- **Unplanned fault playbooks:** failover to hot-standby graph, disable high-risk intents, switch to advisory-only mode, re-attest agents, run postmortem diff.
- **Game days:** cross-layer drills with operator participation; scoreboard tracks MTTR, missed alerts, and rationale completeness.

## 28. API Security & Networking Details
- **mTLS + SPIFFE** for all services; per-intent JWT/OAuth tokens bound to scopes; ALPN-pinned protocols for edge ingress.
- **Rate limits:** per-intent and per-tenant quotas; anomaly-triggered tightening; graceful degradation to telemetry-only intake during floods.
- **Firewalling:** intent-aware network policies; egress restricted to whitelisted simulators and provenance sinks; DNS-over-TLS with policy-aware resolvers.

## 29. CI/CD Implementation Notes (concrete)
- **Pipelines:** GitHub Actions or Tekton with attested runners; reproducible builds via hermetic toolchains (Bazel/nyx) where applicable.
- **Checks:**
  - `npm run lint && npm run format` (platform services)
  - `npm test` plus `cd server && npm test` and `cd client && npm test`
  - `opa test policies/...`
  - `scripts/run_synthetic_triplet.sh` for e2e dry-run
  - `scripts/build_slsa.sh` for provenance and SBOM
- **Promotion:** signed artifacts pushed to OCI registry; policy + agent bundles versioned; deployment triggered only if signatures validate and synthetic triplets stay within risk budgets.

## 30. Rollback & Kill-switch Engineering
- **Rollback hooks:** stored in ledger with versioned state snapshots; one-click rollback in console triggers deterministic replay validation post-restore.
- **Kill-switch:** hardware relay plus software breaker; out-of-band channel; must be acknowledged by two operators; simulator-only fallback auto-engaged.
- **Safety drills:** monthly verification of kill-switch path; ledger receipts required to close drill ticket.

## 31. Operational KPIs & Alerts
- **KPI baselines:**
  - Sensor-to-action latency (fast/deliberative)
  - Approval vs veto ratio by intent class
  - Divergence quarantine rate and mean dwell time
  - Simulator fidelity RMSE
  - Attestation failure rate
- **Alerts:** breach of latency SLO, failed policy verification, repeated veto for same intent, quarantine backlog growth, missing rollback receipt.

## 32. Extension Hooks & Innovation Tracks
- **Neuromorphic reflex plug-in:** optional co-processor path for ultra-low-latency reflex agents with bounded autonomy envelopes.
- **Semantic delta-sync:** ontology-aware diffing to reduce bandwidth while preserving causal auditability.
- **Intent market maker:** auction-based arbitration for contested resources with fairness constraints and privacy budgets.
- **Auto-prover:** SMT-backed verifier runs alongside governance lattice for high-risk domains, emitting proof artifacts into the ledger.

## 33. Cohesion/Entropy/Recovery Delivery Plan
- **Telemetry enrichers:** ship collectors that emit cohesion anchors (physical magnitudes, simulator consensus, agent confidence) alongside signals; expose entropy metrics via the metrics sink for dashboards.
- **Runtime wiring:** enable `cohesion`, `entropy`, and `recovery` analyzers in orchestrator deployments; surface readiness/rationale fields in exported snapshots and audit streams.
- **Runbook updates:** add graceful-degradation playbooks that respond to recovery actions (sampling boosts, simulator priors rebalance, cognitive quorum) with explicit rollback timers and audit tokens tied to fusion signatures.
