# IntelGraph Edge/IoT Master Orchestration (v9)

This playbook operationalizes the Edge/IoT program across device identity, secure transport, data contracts, edge processing, graph ingest, edge AI, OTA, safety/compliance, observability/FinOps, admin UX, and launch enablement. It aligns to IntelGraph defaults and enforces the provided SLO, availability, cost, and privacy guardrails.

## Guardrails and Objectives

- **Performance SLOs**: Gateway/API reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; subscriptions p95 ≤ 250 ms. Edge ingest bursts ≥ 1,000 ev/s per gateway with ≤ 100 ms p95 pre-storage. Graph ops: 1-hop ≤ 300 ms; 2–3 hops ≤ 1,200 ms.
- **Availability Targets**: API 99.9% monthly (0.1% error budget ≈ 43 min). Edge gateways 99.5% with graceful degradation and offline-safe modes.
- **Cost Caps**: Dev ≤ $1k, Stg ≤ $3k, Prod ≤ $18k infra; LLM ≤ $5k (80% alert). Unit targets: ≤ $0.10 per 1k ingested events; ≤ $2 per 1M GraphQL calls.
- **Security/Privacy**: Device PKI + attestation, OIDC/JWT, ABAC via OPA, mTLS, field-level encryption, immutable provenance ledger. Retention defaults: standard 365d, PII 30d unless legal hold.

## Execution Model

- **Parallel Epics**: 11 epics run concurrently; each task ships an artifact, tests/SLO evidence, provenance manifest, and rollback/backout steps.
- **RACI**: MC is approver; owners listed per task. Sub-agents permitted but lineage must be tracked.
- **Evidence Protocol**: Attach tests, dashboards/screens, SLO and cost deltas, cryptographic hashes, and rollback/backout drills for every deliverable.
- **Sprints**: Report per-epic progress (%), fleet health, SLO burn, cost/energy KPIs, and evidence links each sprint.

## Epic Capsules and Acceptance

- **EP1 — Edge Device Identity & Trust**: Identity ADR, PKI hierarchy, provisioning flow, remote attestation service with tests, device registry with ABAC, secure boot baseline, key rotation drill, authority binding, tamper-evident logs, enrollment and break-glass runbooks, edge secrets handling, decommission SOP, compliance mapping, golden provisioning test, onboarding cost model, backout plans.
- **EP2 — Protocols & Connectivity**: Protocol matrix, clustered MQTT/WS broker fabric (≥50k ev/s/cluster), QoS/retained policy with tests, offline retry/backoff, bandwidth shaping, edge mTLS/rotation, NAT/firewall traversal, 5G/LTE/Wi‑Fi failover drills, payload compression, time sync (<50 ms skew), anti-abuse controls, observability dashboards, config-as-code, link harness, store-and-forward backout.
- **EP3 — Data Model & Contracts**: Telemetry schema with linter, twin entity map, validation rules, provenance fields, residency/retention labels, data contracts with CI, edge→graph mapping templates, golden fixtures, unit conversion library with tests, schema diff tool, DPIA, rollback drills.
- **EP4 — Edge Processing & Store-and-Forward**: Pipeline topology, validation/clean/enrich/aggregate stages with coverage, durable queue config, resumable sync protocol, redaction/PII filters, power/compute budgeting, local TSDB config, observability, backfill/replay tool, safe-mode backout.
- **EP5 — Graph-Aware Ingest & APIs**: Upsert templates, constraints/indexes, batch/stream writers (≥50k nodes/s), fleet GraphQL schema and persisted queries, ABAC/OPA policies, rate limits/quotas, caching/ETag plan, redacted error model, contract tests, OTel/audit hooks, throttling backout.
- **EP6 — Edge AI & Model Updates**: Footprint targets, quantization/pruning, deterministic feature extraction with tests, inference engine latency targets, privacy modes, model registry with attestation, OTA model updates with rollback, eval harness, explainability UI, drift monitors/alerts, CPU/Joule budgets, adversarial prompt red-team, backout to pinned model.
- **EP7 — OTA, Config & Release Engineering**: Signed update manifests, cohort definitions, delta tooling, pre-flight checks, rollback drills, OPA policy simulation in CI, evidence bundles with checksums, rollout observability, staged secrets rotation, change freeze protocol, partner driver packs, golden update kit, halt/pin backout.
- **EP8 — Safety, Security & Compliance**: STRIDE/PASTA threat model with mitigations, network segmentation, least-privilege ABAC, SBOM/scans (0 criticals), incident runbooks, privacy modes with DPIA, supply-chain attestations, forensics capture, safety interlocks, export control vetting, emergency shutdown drills.
- **EP9 — Observability & FinOps**: OTel at edge, gateway dashboards, synthetic probes, data-quality monitors, SLO burn alerts, cost dashboards with 80% alerting, evidence packs, alert hygiene, PIR templates, telemetry freeze, customer SLA boards, power/residency KPIs, DR drill KPIs, golden dashboards, noisy-alert backout.
- **EP10 — Edge UX & Field Ops Tools**: Fleet console with RBAC, map/twin viewer, saved procedures with audit, guided troubleshooting, signed evidence export, JIT access requests, in-product help, A11y/kiosk modes, Playwright E2E tests, asset/cost controls, read-only freeze, partner portal, field runbooks, consent UI, incident comms, evidence boards, training academy, console freeze backout.
- **EP11 — Launch & Partner Enablement**: Launch calendar, messaging/positioning, public benchmarks, case studies, partner driver/SDK packs, customer runbooks, SLA tiers, changelog automation, signed release evidence bundle, migration guides, exec scorecard, post-launch analytics, marketplace listing, EOL comms, rollout freeze, feedback funnel, acceptance packs, public docs site.

## Cross-Cutting Controls

- **ABAC & Compliance**: Default-deny policies via OPA; authority bindings logged. Align with NIST 800-53, ISA-95/IEC 62443; DPIA and residency tags enforced at edge.
- **Provenance & Audit**: Immutable ledger for device→gateway logs, signed invocations, tamper-evident chains, and evidence bundles per artifact.
- **Resilience & Backout**: Safe offline modes (store-and-forward), OTA pinning, emergency shutdown and freeze protocols, and per-epic backout playbooks.
- **FinOps**: Cohort-level cost tracking, unit cost SLOs, and 80% budget alarms for infra and LLM spend.
- **Performance Validation**: Golden harnesses for link loss/latency, provisioning, and OTA; perf targets captured as acceptance criteria.

## Execution Rhythm

- **Cadence**: Weekly sprint reviews publish progress %, SLO burn, cost/energy KPIs, drill results, and hashes of evidence bundles.
- **Gate Checks**: CI gates for schemas/contracts/OPA, perf harnesses, SBOM/vuln scans, and OTA simulations. No promotion without green gates and rollback validation.
- **Documentation**: Each artifact ships with a provenance manifest, backout/runbook, and test evidence; dashboards/screenshots linked in evidence packs.

## Forward-Leaning Enhancements

- **Edge autonomy**: Adaptive duty-cycling using real-time power/cost signals to stay within Joule/$ budgets.
- **Graph prefetching**: Predictive caching of near-term twin hops to keep 1-hop/2-hop SLOs tight under intermittent links.
- **Signed delta streams**: Content-addressed deltas for both OTA binaries and model payloads to reduce bandwidth while preserving attestation.
