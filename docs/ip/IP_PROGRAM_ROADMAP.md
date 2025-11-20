# IP Program Roadmap

**Unified, cross-family roadmap for Summit / IntelGraph IP development**

This roadmap collapses the per-family horizons (H0–H3) from `ip-registry.yaml` into a **single, coherent program** organized by strategic themes. Each initiative is bucketed into **now/next/later** and tagged with family IDs, impact, dependencies, and recommended ownership (AI agent vs. human).

**Goal**: Execute an aggressive but achievable roadmap that exceeds any competitor's plausible vision.

---

## Roadmap Principles

1. **Now** = Next 1-3 months (H0 hardening + H1 MVP)
2. **Next** = 3-12 months (H1 MVP completion + H2 v1 initiation)
3. **Later** = 12-36 months (H2 v1 + H3 moonshot)

4. **Theme-driven**: Group initiatives by strategic capability area
5. **Dependency-aware**: Sequence work to unblock downstream families
6. **Ownership-tagged**: Recommend AI agent vs. human execution
7. **Impact-tracked**: Link each epic to IP families and product surfaces

---

## Theme 1: Provenance & Observability

**Families**: F1, F8, F9

**Vision**: Every operation is traceable, auditable, and policy-compliant—making Summit the only platform with proof-carrying analytics and SLO-driven IP development.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| P1.1 | **Harden Provenance Ledger** | F1, F9 | `packages/prov-ledger/` | Stronger typing, 95%+ test coverage, performance benchmarks | AI Agent |
| P1.2 | **Add OTel Spans to Orchestrator** | F1, F8 | `client/src/services/orchestrator/`, `observability/` | Full distributed tracing for all multi-LLM operations | AI Agent |
| P1.3 | **Expand Grafana Dashboards** | F8 | `grafana/`, `observability/` | Add SLO dashboards for all services, link to runbooks | Human |
| P1.4 | **OPA Policy Test Suite** | F9 | `policies/`, `opa/` | Comprehensive tests for all export control policies | AI Agent |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| P1.5 | **Multi-Tenant Provenance** | F1, F9 | `packages/prov-ledger/`, `services/prov-ledger/` | Tenant-isolated audit trails with cross-org federation | Human |
| P1.6 | **Predictive Alerting** | F8 | `monitoring/`, `ml/` | ML-based anomaly detection for SLO violations | Hybrid |
| P1.7 | **Provenance-Linked SLOs** | F1, F8 | All services | Every SLO breach traceable to exact provenance step | AI Agent |
| P1.8 | **Automated Compliance Reporting** | F9 | `controls/`, `contracts/` | One-click EMASS/SOC2 evidence bundles | AI Agent |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| P1.9 | **Self-Healing Provenance** | F1 | `packages/prov-ledger/` | Auto-repair corrupted manifests, detect tampering | Hybrid |
| P1.10 | **Autonomous SRE Agent** | F8 | `monitoring/`, `ops/` | Fully autonomous incident response and remediation | AI Agent |
| P1.11 | **Federated Audit Trails** | F1, F9 | `packages/prov-ledger/` | Cross-organization provenance with zero-knowledge proofs | Human |

---

## Theme 2: AI & Multi-LLM Intelligence

**Families**: F1, F5, F7

**Vision**: The only platform with provenance-first, multi-provider AI orchestration integrated directly into graph investigations—no competitor has this level of explainability and policy enforcement.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| AI2.1 | **Expose Orchestrator GraphQL API** | F1 | `server/graphql/`, `client/src/services/orchestrator/` | Enable UI integration for "Ask Copilot" | AI Agent |
| AI2.2 | **GraphRAG Query Preview UI** | F5 | `client/`, `intelgraph/` | Show users what subgraph will be retrieved before execution | Human |
| AI2.3 | **Multimodal Extraction Tests** | F7 | `server/src/ai/`, `ml/` | 90%+ coverage for OCR, object detection, NER | AI Agent |
| AI2.4 | **Cost-Aware LLM Routing** | F1 | `client/src/services/orchestrator/` | Route queries based on cost budgets and quality thresholds | Hybrid |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| AI2.5 | **Self-Tuning Orchestrator** | F1 | `packages/prov-ledger/`, `ml/` | Learn optimal routing policies from user feedback | Human |
| AI2.6 | **Multi-Hop GraphRAG** | F5 | `intelgraph/`, `graph_xai/` | Follow relationships 3+ hops deep with explainability | AI Agent |
| AI2.7 | **Real-Time Multimodal Pipeline** | F7 | `server/src/ai/`, `data-pipelines/` | Streaming extraction for video/audio with Kafka | Hybrid |
| AI2.8 | **Zero-Shot Entity Extraction** | F7 | `ml/`, `python/` | No training data required, LLM-guided extraction | Hybrid |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| AI2.9 | **Federated Multi-LLM Orchestration** | F1 | All orchestration modules | Air-gapped environments with encrypted model routing | Human |
| AI2.10 | **Cross-Investigation Learning** | F1, F5 | `intelgraph/`, `ml/` | Reuse successful reasoning chains across investigations | Hybrid |
| AI2.11 | **Autonomous Investigation Agent** | F5, F6 | `client/`, `server/`, `intelgraph/` | AI-driven hypothesis generation and entity discovery | AI Agent |

---

## Theme 3: PsyOps & Active Measures

**Families**: F2, F3

**Vision**: The only platform integrating cognitive targeting, narrative simulation, and adversarial defense into investigative workflows—operational capabilities no civilian competitor would dare attempt.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| PS3.1 | **Narrative Sim API in GraphQL** | F2 | `server/src/services/narrative-sim/`, `server/graphql/` | Expose tick loop, event injection, actor management | AI Agent |
| PS3.2 | **Deepfake Detection Tests** | F3 | `adversarial-misinfo-defense-platform/`, `ml/` | Validate all detection modalities (video, audio, image) | AI Agent |
| PS3.3 | **Proportionality Scoring** | F2 | `cognitive-targeting-engine/`, `active-measures-module/` | Policy-based active measures recommendation | Human |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| PS3.4 | **Scenario Builder UI** | F2 | `client/`, `conductor-ui/` | Web-based interface for red/blue team exercises | Human |
| PS3.5 | **Autonomous Tactic Evolution** | F3 | `adversarial-misinfo-defense-platform/`, `ml/` | Self-learning defense system with GAN-LLM hybrid | Hybrid |
| PS3.6 | **Multi-Agent Adversarial Sim** | F2 | `cognitive-targeting-engine/`, `scenarios/` | Red vs blue team with AI agents | Hybrid |
| PS3.7 | **Coordinated Campaign Detection** | F3 | `adversarial-misinfo-defense-platform/`, `intelgraph/` | Behavioral pattern matching across social graphs | AI Agent |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| PS3.8 | **Autonomous Active Measures** | F2 | All cognitive targeting modules | AI-recommended measures with human-in-the-loop approval | Human |
| PS3.9 | **Predictive Threat Modeling** | F3 | `ml/`, `predictive_threat_suite/` | Detect campaigns before they scale using early indicators | Hybrid |
| PS3.10 | **Cross-Domain Narrative Tracking** | F2, F3 | `cognitive-targeting-engine/`, `intelgraph/` | Link cyber, info ops, and kinetic operations | Human |

---

## Theme 4: Graph Intelligence & Investigation UX

**Families**: F5, F6

**Vision**: The most intuitive, AI-augmented investigation workflow in the market—golden path from Investigation → Entities → Copilot → Results with no friction.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| GI4.1 | **Golden Path Observability** | F6 | `client/`, `server/`, `observability/` | Track user journey metrics, identify friction points | AI Agent |
| GI4.2 | **Onboarding Flow** | F6 | `client/`, `conductor-ui/` | Guided tutorial for new analysts | Human |
| GI4.3 | **Query Preview Polish** | F5 | `client/`, `intelgraph/` | Improve UX for GraphRAG query preview | Human |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| GI4.4 | **Temporal Investigation** | F6 | `intelgraph/`, `db/` | Time-travel queries, bitemporal graphs | Hybrid |
| GI4.5 | **Advanced Graph Analytics** | F6 | `intelgraph/`, `graph_xai/` | Centrality, communities, path finding in UI | AI Agent |
| GI4.6 | **Adaptive GraphRAG** | F5 | `intelgraph/`, `ml/` | Learn which subgraphs are most useful per investigation type | Hybrid |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| GI4.7 | **Autonomous Hypothesis Generation** | F5, F6 | `intelgraph/`, `ml/` | AI proposes next entities/relationships to explore | Hybrid |
| GI4.8 | **Cross-Investigation Pattern Detection** | F6 | `intelgraph/`, `analytics_layer/` | Find similar cases across all investigations | AI Agent |
| GI4.9 | **Federated Investigations** | F6 | `intelgraph/`, `contracts/` | Multi-org collaboration with policy enforcement | Human |

---

## Theme 5: Data Connectors & ETL

**Families**: F10

**Vision**: The fastest data onramp in the industry—plug any source, stream or batch, with automatic schema inference and provenance tracking.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| DC5.1 | **Connector Test Coverage** | F10 | `connectors/`, `data-pipelines/` | 90%+ coverage for all 17 connectors | AI Agent |
| DC5.2 | **Connector Status Dashboard** | F10 | `client/`, `server/graphql/` | Real-time health and ingestion metrics | Human |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| DC5.3 | **Kafka Streaming Connectors** | F10 | `connectors/`, `data-pipelines/`, `kafka/` | Real-time ingestion with backpressure handling | Hybrid |
| DC5.4 | **AI-Inferred Schema Mappings** | F10 | `connectors/`, `ml/` | Zero-config connectors using LLM schema inference | Hybrid |
| DC5.5 | **Dark Web Connectors** | F10 | `connectors/` | Telegram, Tor forums, paste sites | Human |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| DC5.6 | **Autonomous Connector Discovery** | F10 | `connectors/`, `ml/` | Auto-discover and configure new data sources | AI Agent |
| DC5.7 | **Federated Data Mesh** | F10 | `connectors/`, `contracts/` | Cross-org data sharing with policy enforcement | Human |

---

## Theme 6: FinOps & Cloud Arbitrage

**Families**: F4

**Vision**: First-of-its-kind multi-cloud arbitrage with carbon/energy/financial optimization—no competitor even attempts this level of sophistication.

### Now (Next 1-3 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| FO6.1 | **Cost Tracking Foundation** | F4 | `finops/`, `ga-graphai/packages/cloud-arbitrage/` | Define data model for workload cost attribution | Human |
| FO6.2 | **Arbitrage Scoring POC** | F4 | `finops/` | Proof-of-concept scoring engine for AWS | Hybrid |

### Next (3-12 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| FO6.3 | **Multi-Provider Arbitrage** | F4 | `finops/`, `ga-graphai/packages/cloud-arbitrage/` | AWS + GCP + Azure with automatic failover | Human |
| FO6.4 | **Carbon Intensity Tracking** | F4 | `finops/`, `observability/` | Real-time carbon metrics per workload | Hybrid |
| FO6.5 | **A/B Benchmark Framework** | F4 | `finops/`, `benchmarks/` | Validate savings claims vs. industry tools | AI Agent |

### Later (12-36 months)

| Epic ID | Name | Families | Key Modules | Impact | Owner |
|---------|------|----------|-------------|--------|-------|
| FO6.6 | **Autonomous FinOps Platform** | F4 | `finops/` | Fully autonomous cost optimization with billing integration | Hybrid |
| FO6.7 | **Predictive Cost Modeling** | F4 | `finops/`, `ml/` | Forecast workload demand and optimize ahead of time | Hybrid |
| FO6.8 | **Cross-Market Arbitrage** | F4 | `finops/` | Energy futures and carbon credits trading | Human |

---

## Sequencing & Dependencies

### Critical Path (Must Do First)

1. **P1.1** (Harden Provenance Ledger) → Unblocks F9, F1 downstream work
2. **AI2.1** (Expose Orchestrator API) → Unblocks all UX integration
3. **P1.2** (Add OTel Spans) → Enables observability for all families
4. **DC5.1** (Connector Tests) → Ensures data quality for all investigations

### Parallel Tracks

- **PsyOps** (Theme 3) can proceed independently but benefits from F1 orchestrator
- **FinOps** (Theme 6) is mostly independent, can be prototyped in parallel
- **Graph Intelligence** (Theme 4) depends on F5 (GraphRAG) being stable

---

## Ownership Recommendations

### AI Agent = Majority

- Test coverage and hardening epics (P1.1, AI2.3, DC5.1)
- Metric and observability additions (P1.2, GI4.1)
- API exposure and integration work (AI2.1, PS3.1)
- Routine refactoring and code quality

### Human = Minority

- UX design and product decisions (AI2.2, PS3.4, GI4.2)
- Strategic integrations (P1.5, PS3.8, FO6.3)
- Novel algorithm design (PS3.3, FO6.8, GI4.9)

### Hybrid = Complex

- ML model development (AI2.5, PS3.5, DC5.4)
- Cross-domain integrations (P1.7, AI2.7, PS3.6)
- Research-heavy work (AI2.8, PS3.9, FO6.7)

---

## Success Metrics

**Per Theme**:
- Provenance & Observability: 100% SLO coverage, <1% alert fatigue
- AI & Multi-LLM: <500ms p95 latency, 95%+ user satisfaction
- PsyOps & Active Measures: >90% detection accuracy, <5% false positives
- Graph Intelligence: <3s investigation load time, >80% task completion rate
- Data Connectors: <5min connector onboarding, 99.9% uptime
- FinOps & Cloud Arbitrage: 3-5% incremental savings, 18% carbon reduction

**Overall**:
- All H0 epics complete in 3 months
- All H1 epics complete in 12 months
- At least 3 H2 epics initiated in 12 months

---

## Competitive Moat Assessment

**Per Theme**:
1. **Provenance & Observability**: No competitor has proof-carrying analytics at this level
2. **AI & Multi-LLM**: Palantir/Databricks have AI, but not multi-provider orchestration with provenance
3. **PsyOps & Active Measures**: Civilian competitors will not attempt this (regulatory/ethical barriers)
4. **Graph Intelligence**: Graphistry/GraphAware lack AI copilot integration
5. **Data Connectors**: Comparable to Splunk/Sentinel, but provenance is differentiator
6. **FinOps & Cloud Arbitrage**: Unique—no competitor does incentive-aware routing

**Verdict**: Themes 1, 2, 3, and 6 are **un-replicable moats**. Themes 4 and 5 are **table stakes with differentiation**.

---

## Next Steps

1. **Prioritize Now epics**: Assign owners, create GitHub issues/PRs
2. **Set up IP metrics tracking**: Run `pnpm run ip:metrics` weekly
3. **Quarterly roadmap review**: Adjust horizons based on progress and market intel
4. **Monthly executive sync**: Report on IP maturity and competitive positioning
5. **Continuous annotation**: As code evolves, update `@ip-family` tags

This roadmap is **living and aggressive**—update it relentlessly to stay ahead of the market.
