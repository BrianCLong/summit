# Where the field is (and where it’s going)

**Signals from 2025**

- Enterprises are moving to **agentic operating models**; the payoff isn’t just automation but redesigned orgs and value creation loops. ([McKinsey & Company][1])
- **Flattening** is real: leadership concentrates at the top, middle layers thin, execution becomes agent-led. That shape rewards strong governance + telemetry. ([Fortune][2])
- **Framework status**:
  - **AutoGen/AG2** = mature multi-agent programming (Python), high dev adoption. ([GitHub][3])
  - **LangGraph** = stateful agent graphs and interrupts; strong for complex orchestrations. ([Microsoft GitHub][4])
  - **OpenAI Swarm** = clean patterns for handoffs/routines but **explicitly experimental** (not for prod). ([Analytics Vidhya][5])
  - **Semantic Kernel** added multi-agent orchestration for .NET estates. ([Microsoft for Developers][6])
  - **AWS** is pushing **Bedrock “agentic” stacks** + exec guidance; most live use today is autonomy **Level 1–2**; Level 3 exists but narrow. ([Amazon Web Services, Inc.][7])
  - **Devin** is normalizing full-stack agent dev; price pressure is already visible. ([Venturebeat][8])

**Implication**: The winners are not “a framework” but **operating systems for companies**—safe autonomy, provable ROI, and org-as-code. That’s the lane for **CompanyOS + IntelGraph + Maestro**.

---

# Competitive posture (how we beat them)

### Beat them **at what they do**

- **AutoGen/LangGraph/Semantic Kernel** (dev-first): ship **SDK parity** via an **Agent Adapter Layer** (AAL) that runs our plans on their ecosystems while keeping IntelGraph policy/provenance. Result: devs don’t have to choose; we **wrap** them.
- **Devin** (dev lifecycle): keep full-stack autonomy, but **gate prod** with our SLSA + Kyverno + Rollouts **SLO-gated deploys** (already wired). We match the “build” and win in **safe ship**. ([Amazon Web Services, Inc.][7])

### Beat them on **combination** (others don’t ship these together)

- **Org-as-Code + Risk-Tiers + Attested Deploys + SLO Gates** in one pipeline—from plan → code → canary → rollback with evidence. Most platforms do _some_ of this, not the **closed loop**. ([McKinsey & Company][1])
- **Mesh governance**: autonomy budgets, anti-sprawl quotas, and decision lineage **as first-class graph entities** (IntelGraph), not “afterthought logs.”

### Beat them **generationally**

- **Policy-native graph** (IntelGraph): every workflow/decision is a signed node with relationships to policies, models, datasets, and outcomes—**auditable and reproducible**.
- **SLO-as-guardrail**: canaries block on **p95/5xx** analysis via Prometheus templates—not just dashboards but **gates**. (You deployed these.)
- **Zero-trust egress + cost governance** baked into chart values; not an add-on.

### What **only we** can do (defensible moat)

1. **Org Mesh Twin**: a continuously updated **digital twin of the org**—nodes, agents, SLOs, autonomy usage, and cost per outcome— surfaced in Console and exportable to auditors.
2. **Autonomy Credit Market**: per-node **autonomy credits** (Tier-2/Tier-3 runs/day). Credits can be **loaned** across nodes with policy hooks and CFO visibility. Nobody else meters autonomy this way.
3. **Provenance-first CX**: all Tier ≥2 customer-facing changes require **SLSA attestation + approval** tied to a **Customer Impact Card** (who/what/why/rollback). That becomes your trust brand.
4. **Sector-pack “compliance by construction”**: HIPAA/PCI/GDPR overlays as IntelGraph policy packs, with **pre-linked evidence collectors**.

---

# Forecasts (through 2027)

- **Adoption S-curve**: Majority stays at autonomy Level 1–2 in 2025; Level-3 grows in well-scoped domains (SRE, FinOps recon, GTM ops) as guardrails mature. Our stack directly targets these “contained L3s.” ([Amazon Web Services, Inc.][7])
- **Value capture**: In advanced industries alone, agentic AI could add **$450–$650B** annual revenue by 2030. Across SaaS/Services, expect **5–10% revenue uplift** plus **≥30% opex reduction** where autonomy replaces repetitive IC effort. We anchor ROI in **causal proofs** (pre/post, synthetic control) captured in IntelGraph. ([McKinsey & Company][9])
- **Price compression** (e.g., Devin drop): platform margin shifts from “tokens + seats” to **assured outcomes + compliance**. Our pricing model should bundle **Platform + Autonomy Credits + Compliance/Evidence**.

---

# 12-Month Generational Roadmap (CompanyOS)

### Q0 (now–6 weeks) — **Dominate the safety loop**

- **Ship**:
  - Org-as-Code seeds (you have), **Autonomy Budgets**, anti-sprawl quotas, per-node KPIs in Console.
  - **SLSA attestations + Kyverno** baseline (digest + allowlist enforced; key-pair optional while Kyverno CRDs catch up).
  - **Argo Rollouts + Prometheus analysis gates** (done).

- **Metric bar**: 0 critical CVEs; 100% deploys with digest + signature; rollback < 5m.

### Q1 — **SDK Parity + Bridge the ecosystems**

- **AAL (Agent Adapter Layer)**: run Maestro plans on **LangGraph, AutoGen/AG2, SK** with uniform policy hooks & telemetry. (We win by **embracing** dev ecosystems.) ([Microsoft GitHub][4])
- **Memory & tools**: adapters for Zep-style long-term memory and Bedrock Agents toolsets. ([Amazon Web Services, Inc.][7])
- **Console**: Org Mesh Twin dashboard (autonomy index, approval heatmap, ROI).

### Q2 — **Proof-at-scale (contained L3)**

- **Contained-L3 playbooks**:
  - SRE incident triage (OOOPSiferGPT) with Tier-3 approvals + auto-revert.
  - Finance recon (Royalcrown IG) with read-mostly autonomy.
  - Growth ops (Guy IG) with capped Tier-2 experiments.

- **Evidence automation**: SOC2/ISO controls mapped; **DECISIONS.md** + artifacts streamed to evidence lockers.
- **Pilot at 3 customers**; target **≥20% cycle-time reduction** and **≤5% change failure** with documented causality.

### Q3 — **Autonomy Market + Sector Proof**

- **Autonomy Credits** live with CFO dashboards; internal “loan/borrow” with policy.
- **Sector packs**: finserv + public go GA with prebuilt integrations, residency toggles.
- **GTM**: 2-week PoV factory (scripts + ROI deck); aim for **≥80% PoV win-rate**.

### Q4 — **Only-we features go mainstream**

- **Org Mesh Twin** becomes the **planning surface** (click a node → propose redistribution of autonomy + budget with Monte Carlo).
- **SLO-Driven Progressive Delivery** default for all agents.
- **Sovereign mode**: single-tenant/VPC with FIPS crypto and air-gapped artifact mirroring.

---

# Product spec (delta from status quo)

1. **IntelGraph 2.0**
   - **First-class “AutonomyCredit” entity** with policies and accrual.
   - **EvidenceLink** nodes tying SLSA attestations, CI logs, and approvals.
   - **CausalOutcome** entity linking interventions → ROI metrics (uplift, cost avoidance).

2. **Maestro Conductor++**
   - **Plan Evaluators Library**: red-team prompts, regression suites, cost ceilings, **SLO gates**.
   - **Multi-runtime** (AAL): run graph plans on LangGraph/AG2/SK; preserve telemetry to IntelGraph. ([Microsoft GitHub][4])
   - **Two-man rule automation** with batched approvals and partial execution (dry-run → gated steps).

3. **CompanyOS Console**
   - **Org Mesh Twin** dashboard: autonomy index, flattening index, error-budget burn, cost per outcome.
   - **Approval Heatmap** and **Autonomy Market** (credits view, requests, loans).
   - **Trust Wall**: every Tier ≥2 change shows provenance card with rollback one-click.

4. **Supply-chain & Ops**
   - **SLSA provenance + Kyverno** enforcement (Audit→Enforce as CRDs allow).
   - **Argo Rollouts** everywhere; **availability + latency + error-rate** analyses by default.
   - **Zero-trust egress** and **Kubecost** quotas by namespace.

---

# Pricing & packaging (aligned to where value accrues)

- **Platform Fee** (per tenant) + **Autonomy Credits** (Tier-2/Tier-3 runs) + **Compliance Add-ons** (evidence automation, sovereign, HIPAA/PCI).
- **Outcome accelerators**: sector packs and contained-L3 playbooks as add-ons with **PoV-to-prod rebates**.

---

# KPIs to run the business

- **Autonomy Index** (share of tasks executed Tier ≥1 without intervention)
- **Flattening Index** (mgr\:IC ratio; target ≤ 1:12 without SLO regressions)
- **Change Failure Rate** ≤ 5%; **MTTR** ≤ 30m; **Rollback** < 5m
- **Evidence freshness** (time to audit-ready) ≤ 24h
- **ROI**: uplift %, cost avoided, time-to-value per node

---

# Your next three moves (actionable)

1. **Lock the “embrace, extend, govern” strategy**: green-light AAL (AutoGen/LangGraph/SK adapters) so we ride their ecosystems while owning governance. ([Microsoft GitHub][4])
2. **Turn on Org Mesh Twin + Autonomy Budgets** in Console; set Q0 targets (Autonomy Index +15%, Change Failure ≤5%).
3. **Pick two contained-L3 PoVs** (SRE triage, Growth ops). Instrument causal ROI and publish the proof deck.

If you want, I’ll ship:

- **IntelGraph 2.0 schema patch** (AutonomyCredit, EvidenceLink, CausalOutcome),
- **AAL stubs** for LangGraph/AG2/SK with telemetry to IntelGraph, and
- **Console Org Mesh Twin** dashboard JSON (Grafana) with the autonomy/flattening/ROI panels we defined.

[1]: https://www.mckinsey.com/capabilities/quantumblack/our-insights/seizing-the-agentic-ai-advantage 'Seizing the agentic AI advantage'
[2]: https://fortune.com/2025/08/07/ai-corporate-org-chart-workplace-agents-flattening/?utm_source=chatgpt.com 'AI is already changing the corporate org chart'
[3]: https://github.com/microsoft/autogen?utm_source=chatgpt.com 'microsoft/autogen: A programming framework for agentic AI'
[4]: https://microsoft.github.io/autogen/stable//index.html?utm_source=chatgpt.com 'AutoGen'
[5]: https://www.analyticsvidhya.com/blog/2024/10/openai-swarm/?utm_source=chatgpt.com 'How OpenAI Swarm Enhances Multi-Agent Collaboration?'
[6]: https://devblogs.microsoft.com/semantic-kernel/semantic-kernel-multi-agent-orchestration/?utm_source=chatgpt.com 'Semantic Kernel: Multi-agent Orchestration'
[7]: https://aws.amazon.com/blogs/aws-insights/the-rise-of-autonomous-agents-what-enterprise-leaders-need-to-know-about-the-next-wave-of-ai/?utm_source=chatgpt.com 'The rise of autonomous agents: What enterprise leaders ...'
[8]: https://venturebeat.com/programming-development/devin-2-0-is-here-cognition-slashes-price-of-ai-software-engineer-to-20-per-month-from-500?utm_source=chatgpt.com 'Devin 2.0 is here: Cognition slashes price of AI software ...'
[9]: https://www.mckinsey.com/industries/automotive-and-assembly/our-insights/empowering-advanced-industries-with-agentic-ai?utm_source=chatgpt.com 'Empowering advanced industries with agentic AI'

---

# Vertical Strategy: Summit Intelligence Platform

While CompanyOS provides the operating system, **Summit** is the flagship intelligence analysis application built on top of it. We have established a dedicated strategic roadmap to evolve Summit into a superior open-source alternative to **Maltego**, **Recorded Future**, and **Palantir Gotham**.

See the full plan here: [STRATEGIC_EVOLUTION_PLAN.md](./STRATEGIC_EVOLUTION_PLAN.md).

**Key pillars:**
1. **OSINT Ingestion & Enrichment**: 50+ free transforms and open threat feeds.
2. **Threat Intel & Predictive Analytics**: AI-driven forecasting and open IOC repositories.
3. **Data Fusion & Visualization**: High-scale Neo4j graph fusion and 3D geospatial views.
4. **Disruption**: Community-driven marketplace for transforms and seamless interoperability.
