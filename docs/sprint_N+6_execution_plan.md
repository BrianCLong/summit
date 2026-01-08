# Sprint N+6 Execution Plan — Marketplace/OEM Readiness + Funnel Ops + Hardening at Scale

## Objectives and Success Criteria

- **Distribution-ready packaging:** Marketplace templates, OEM bundle, and migration/upgrade paths enable unattended cold-start deployments.
- **Funnel operations at scale:** Standardized evaluation playbooks and dashboards support 3–5 concurrent evals with predictable time-to-value.
- **Robustness as a gate:** Reliability/regression suites (shift, injection, noisy retrieval, long-context, tool-failure) promoted to blocking CI/canary gates.
- **Fleet economics and controls:** Per-tenant cost/SLO telemetry with budget caps, throttles, and safe fallbacks.
- **Enterprise assurances:** Close kit v2 with air-gap readiness (signed artifacts, SBOM, provenance) and IP evidence mapped to tests/telemetry/config flags.

## Cross-Workstream Timeline (10 working days)

- **Days 1–2:** Finalize packaging decision tree (SaaS/VPC/on-prem/air-gapped) and reference sizing; lock evaluation playbook template; stub robustness suite v2 gaps.
- **Days 3–4:** Implement marketplace artifacts (container, Helm/Terraform templates) and OEM minimal runtime with offline license verification harness; wire time-to-value metric into ops dashboard.
- **Days 5–6:** Promote robustness suite v2 to CI blocking gates; add canary gating hooks; land fleet telemetry schema for per-tenant cost attribution and SLO events.
- **Days 7–8:** Enable budget caps (throttle/fallback policies) and connector delivery (highest leverage system); produce enterprise packet v2 + provenance bundle.
- **Days 9–10:** Validate cold-start deploy via templates only; run paid-eval SKU dry run; publish IP evidence pack (claims → tests → telemetry) and finalize funnel dashboard.

## Workstream Plans and Owners

- **Product & Program (Funnel Ops):**
  - Owner: Product Ops Lead
  - Actions: Standard eval plan template with close criteria in CRM automation; define time-to-value metric; weekly dashboard for inbound/outbound lead progression; SLA alert if no plan within 24h.
- **Research (Robustness Gates):**
  - Owner: Reliability Lead
  - Actions: Expand robustness suite v2 cases (shift, injection, noisy retrieval, long-context, tool-failure); integrate into CI and prod canaries as blocking; record baselines and failure playbooks.
- **Architecture (Distribution Modes):**
  - Owner: Platform Architect
  - Actions: Publish decision tree for SaaS/VPC/on-prem/air-gapped; reference architectures with CPU/GPU/NPU sizing and latency/cost expectations; validate with smoke tests.
- **Engineering (Marketplace/OEM Build):**
  - Owner: Delivery Engineering
  - Actions: Marketplace container + Helm/Terraform modules; OEM minimal runtime bundle with offline license verification; schema/config migration mechanism; unattended cold-start smoke pack.
- **Experiments & Monitoring (Fleet Telemetry):**
  - Owner: Observability Lead
  - Actions: Per-tenant cost attribution, SLO compliance reports; budget guardrails (auto-throttle/fallback, budget alerts); tenant isolation in throttling; alert routing.
- **IP (Portfolio Hardening):**
  - Owner: IP Program Manager
  - Actions: Claim family expansion (distribution, multi-tenant metering, canary eval, drift gating); evidence pack tying claims to tests/telemetry/config flags.
- **Compliance & Security (Enterprise Close Kit):**
  - Owner: Security Lead
  - Actions: Security/privacy/retention/IR/supply-chain packet v2; offline SBOM + signed artifacts + provenance bundle; questionnaire responses catalog.
- **Integration (Connectors):**
  - Owner: Integrations Lead
  - Actions: Ship one high-leverage connector with independent versioning; standard events/webhooks + audit trail export; no core forks required.
- **Commercialization (Marketplace/OEM/Partner):**
  - Owner: BizOps Lead
  - Actions: Marketplace listing draft, pricing/metering alignment; OEM partner kit (integration guide, licensing model, support boundaries); Paid Eval v2 SKU (fixed price/timeline/deliverables).

## Definition of Done Alignment

- **Distribution-ready:** Marketplace/OEM artifacts validated by unattended cold-start deploy and migration/upgrade path.
- **Funnel capacity:** Processes and dashboards sustain 3–5 concurrent evals with SLA-backed response times.
- **Cost/SLO guardrails:** Per-tenant caps enforce throttling/fallback without cross-tenant impact; actionable SLO breach alerts.
- **Robustness gates:** CI/canary blocks on regressions across robustness suite v2 categories.
- **IP evidence:** Claim-to-evidence mapping shipped with logs/metrics/tests/config flags and provenance bundle.

## Risks and Mitigations

- **Heterogeneous environments (air-gapped/on-prem):** Provide offline artifacts, deterministic builds, and hardware sizing guides; run cold-start smoke on target profiles.
- **Evaluation SLA slippage:** Automate SLA checks for plan creation within 24h; pre-approved templates and auto-reminders.
- **Budget guardrail regressions:** Simulate throttle/fallback scenarios in staging with tenant isolation; include in robustness suite v2.
- **Connector delays:** Prioritize most requested system; ensure versioning independent of core and publish mock/test harness.
- **License verification drift:** Include offline verification harness in OEM bundle with migration tests and fallback policies.

## Fast-Forward Enhancements (Forward-Looking)

- **Predictive resource orchestration:** Use workload forecasting to auto-select deployment profile (CPU/GPU/NPU) and pre-warm capacity per tenant.
- **Adaptive robustness scoring:** Weight robustness suite results by tenant risk profile to prioritize canary gating decisions.
- **Telemetry co-pilot:** Automatic summarization of SLO/cost events into exec-ready weekly reports with recommended remediations.
