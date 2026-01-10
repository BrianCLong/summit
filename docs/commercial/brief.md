# Commercial Brief: Pilot, Packaging, Licensing, and Moat Outcomes

## Pilot Proposal

- **Target Verticals**
  1. **Defense/Intelligence Fusion Centers**
     - _Problem:_ Slow threat triage across fragmented SIGINT/OSINT datasets and manual adjudication queues.
     - _Pilot Scope:_ Deploy IntelGraph copilot for cross-domain signal fusion, entity resolution, and red/blue team casebooks; integrate with existing TIP/SIEM feeds.
     - _Success Criteria:_ 30% reduction in triage time, 20% lift in high-confidence alerts, <2% false-positive regression versus baseline.
  2. **Financial Crime & Fraud (Large Banks/FinTechs)**
     - _Problem:_ High SAR backlog, inconsistent investigator outcomes, limited graph context across KYC/transactional data.
     - _Pilot Scope:_ Risk graph ingestion of KYC, payments, device, and comms metadata; investigator copilot for case summarization and escalation recommendations; workflow plug-ins for case management systems (e.g., Actimize, Mantas).
     - _Success Criteria:_ 25% reduction in SAR cycle time, 15% uplift in suspicious pattern detection recall, ≥10% reduction in manual rework.

- **Pilot Design & Governance**
  - 6-week structured pilot with Week 0 secure deployment readiness check, Weeks 1–4 iterative tuning, Weeks 5–6 measurement and hardening.
  - Joint runbook for incident response, policy-as-code validation, and safety guardrails aligned to the Meta-Governance Framework.
  - Provenance ledger enabled by default; red-team scenario library executed before production data exposure.

- **Pricing Hypothesis (Pilot)**
  - Fixed pilot fee with outcome accelerator: **$250k base** + **$50k success fee per achieved KPI** (cap 2 KPIs) to align incentives and cover enablement.
  - Optional managed support add-on during pilot: **$25k** for 24/5 ops desk and rapid rule/ontology updates.

## Packaging Strategy

- **Primary Form Factors**
  - **SDK:** TypeScript/Python SDK for embedding graph queries, policy checks, and copilot intents into existing analyst tools; ships with typed models and offline stubs for air-gapped validation.
  - **Runtime Service:** Containerized IntelGraph runtime (API + policy engine + provenance ledger) with Helm/Kustomize manifests; supports BYO vector DB and KMS/HSM integration.
  - **Eval Harness:** Reproducible evaluation harness for scenario replay, bias/attack simulations, and KPI tracking; integrates with CI and emits signed provenance artifacts.

- **Reference Bundles**
  - **Starter Pack:** SDK + eval harness, single-tenant runtime, limited connectors (file, REST) — ideal for R&D and PoCs.
  - **Operations Pack:** Runtime HA cluster, connector pack (SIEM/TIP/AML), policy library, and governance dashboards; SLAs and SSO/SCIM included.
  - **Air-Gap Pack:** Offline artifact delivery, deterministic builds, FIPS crypto, and on-prem eval harness with artifact attestation.

## Licensing Outline

- **Core License:** Commercial EULA with field-of-use restrictions for prohibited surveillance/weaponization per governance policy; source-obfuscated binaries for runtime, source-available SDK for customer-side extensions.
- **Connector/Policy Packs:** Tiered subscription with update rights; customers may author private policies under their tenant namespace.
- **Eval Harness:** Source-available under a business-source-style license (production use triggers commercial terms after evaluation period).
- **Open Components:** Clearly partitioned under OSS-MIT-LICENSE where already published; no copyleft contamination allowed in runtime distribution.
- **Data & Model Usage:** Customer data remains customer-owned; model fine-tunes gated by data processing addendum (DPA) and logged in provenance ledger.

## Moat Story → Measurable Outcomes & Claims

- **Provenance & Auditability Moat**
  - Claim: End-to-end provenance ledger with policy-as-code gating reduces approval latency while improving audit confidence.
  - Measurable: ≥95% of decision paths emit signed provenance events; audit retrieval under 2 minutes for any case.
- **Governed Copilot with Safety Guardrails**
  - Claim: Domain-specific copilot constrained by governance policies lowers operational risk versus general LLM agents.
  - Measurable: <1% policy violation rate in pre-production red-team suite; <0.1% in production with continuous policy drift checks.
- **Graph-First Signal Fusion**
  - Claim: Native graph embeddings and entity resolution yield materially higher detection quality on multi-modal signals.
  - Measurable: ≥15% lift in precision/recall against incumbent rule engines on benchmark scenarios; top-K entity resolution accuracy ≥0.9.
- **Deterministic, Air-Gapped Deployability**
  - Claim: Reproducible builds with offline eval harness enable regulated customers to adopt safely.
  - Measurable: Rebuild-to-deploy reproducibility hash match rate ≥99%; air-gapped deployment completed within 48 hours from artifact receipt.
- **Rapid Connector Extensibility**
  - Claim: Connector SDK and sandbox reduce time-to-new-source ingestion.
  - Measurable: New data source onboarding in ≤3 days with certified connector templates; <4 engineer-days for custom connector development.

## Next Steps & Owner Assignments

- Finalize pilot SOWs with security and legal; attach DPA templates and data handling runbooks.
- Stand up KPI dashboard using eval harness outputs for both vertical pilots.
- Schedule joint red-team + reliability drills before production cutover; capture results in provenance ledger.
