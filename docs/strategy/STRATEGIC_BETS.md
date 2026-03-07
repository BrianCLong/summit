# Strategic Bets (12-24 Month Horizon)

**Status:** Draft
**Owner:** Platform Strategy Lead (Jules)
**Last Updated:** 2025-10-27

## Executive Summary

Summit is pivoting from a general-purpose graph intelligence platform to a **Governance-First Cognitive Enterprise System**. We are placing four asymmetric bets that leverage our existing moats (Provenance, Graph) to capture high-value, high-risk markets.

We are explicitly **not** pursuing general-purpose AI chat, ad-tech, or low-stakes consumer applications.

---

## Bet 1: Regulated Agentic Marketplace (The "Trust Broker" Play)

- **Definition:** A marketplace for autonomous AI agents (Solvers) where every action, decision, and output is cryptographically signed and verified against a governance policy.
- **Target Customer:** Financial Services, Healthcare, Defense, Critical Infrastructure.
- **Differentiation:**
  - **Competitors:** HuggingFace (Open, unverified), OpenAI GPT Store (Black box).
  - **Summit:** "Certified" Agents. We provide the _proof_ of what the agent did (Provenance Ledger) and the _guarantee_ of what it is allowed to do (OPA).
- **Required Capabilities:**
  - Agent Identity (SPIFFE/OIDC).
  - Policy-Carrying Agents (WASM-based policies embedded in agent artifacts).
  - Verifiable Output (Merkle proofs for agent reasoning chains).
- **Risks:** Market readiness (too early?), Complexity of agent standardization.

## Bet 2: Continuous Assurance as a Service (CAaaS)

- **Definition:** Transforming compliance from a quarterly audit panic into a real-time data stream. The platform automatically generates evidence for SOC2, ISO 27001, and specific industry regulations based on system activity.
- **Target Customer:** B2B SaaS aiming for enterprise readiness, Government contractors.
- **Differentiation:**
  - **Competitors:** Vanta/Drata (Checklist automation, surface level).
  - **Summit:** "Evidence-Complete" Operation. We don't just check configs; we log the _actual operational data_ that proves compliance (e.g., "Show me the logs for every time Admin X accessed data Y").
- **Required Capabilities:**
  - Deep telemetry integration (OpenTelemetry -> Ledger).
  - Automated Auditor Reports (PDF/JSON generation).
  - "Drift Detection" for compliance posture.
- **Risks:** commoditization of compliance tools, integration fatigue.

## Bet 3: Enterprise Cognitive Defense Platform (PsyOps Defense)

- **Definition:** A suite of tools to detect, analyze, and counter information warfare and cognitive influence operations targeting the enterprise.
- **Target Customer:** Global Enterprises, Public Sector, Brand Protection Agencies.
- **Differentiation:**
  - **Competitors:** Social Listening Tools (Brandwatch - Passive), Cyber Threat Intel (CrowdStrike - Technical focus).
  - **Summit:** Narrative & Influence focus. We map the _network of influence_ and detect coordinated inauthentic behavior using graph algorithms.
- **Required Capabilities:**
  - Ingestion at scale (Social, Media, Dark Web).
  - Narrative clustering algorithms.
  - "Influence Surface" mapping.
- **Risks:** High false positives, privacy concerns, platform API access restrictions (X/Reddit/Meta).

## Bet 4: The Auto-Scientist SDK (IP Commercialization)

- **Definition:** Packaging our internal "Auto-Scientist" research stack (Experiment Graph, Hypothesis Generation) into a licensable SDK for R&D-heavy organizations.
- **Target Customer:** Pharma/Biotech, Material Science, Hedge Funds.
- **Differentiation:**
  - **Competitors:** Lab Notebooks (Benchling), General ML Ops (MLflow).
  - **Summit:** "Autonomous Discovery". We don't just track experiments; the system _proposes_ the next experiment based on the Knowledge Lattice.
- **Required Capabilities:**
  - Python SDK (High quality, well documented).
  - Jupyter Notebook integration.
  - HPC/Batch job orchestration (pg-boss/K8s).
- **Risks:** Niche market, high support requirement for scientists.

---

## Explicit Non-Bets (What We Will NOT Do)

- **General Consumer Chatbot:** We will not build a "SummitGPT" for general Q&A. Focus is specialist/enterprise.
- **Ad-Tech / Marketing Automation:** We are a _Defense_ and _Governance_ platform, not an amplification platform.
- **Proprietary Hardware:** We run on commodity cloud/on-prem.
- **Low-Code App Builder:** We are an API/SDK-first platform for engineers and analysts, not a "drag-and-drop app builder" for general business users (except for specific investigation workflows).
- **Raw Data Reselling:** We sell the _intelligence_ and the _platform_, not the raw customer data.

---

## Owners

- **Bet 1 (Agents):** Head of Product (Agentic Systems).
- **Bet 2 (Assurance):** Head of Engineering (Governance).
- **Bet 3 (Cognitive Defense):** Head of Threat Intelligence.
- **Bet 4 (Auto-Scientist):** Head of Research / Chief Scientist.
