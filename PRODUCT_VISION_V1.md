# Summit Product Vision v1

> **Status:** Draft — 2026-03-11
> **Owner:** Product
> **Branch:** `claude/summit-product-vision-92A9V`

---

## 1. Mission

Summit exists to turn fragmented signals, documents, events, and machine outputs into governed, explainable, decision-grade intelligence.

---

## 2. Thesis

**Summit is the evidence operating system for intelligence, investigations, and complex operational decision-making.**

One sentence that governs every roadmap decision. Not a dashboard, not an agent playground, not a graph viewer. A system whose job is to take messy reality and produce **trusted, operationally usable truth**.

> Internal doctrine: **Evidence first. Structure second. Synthesis third. Decision last.**

---

## 3. Category Claim

**Evidence-native intelligence platform.**

Summit is not another AI copilot, analytics dashboard, or OSINT toolkit. It is the system organizations reach for when the **cost of being wrong is high**.

What this category means in practice:
- The graph is infrastructure, not the headline
- AI and agents are accelerants, not the product
- Governance and provenance are product differentiators, not compliance overhead
- Outputs are defensible, not merely plausible

---

## 4. Wedge Personas

### Primary Buyer

**Director / VP / Head of:**
- Intelligence or Investigations
- Trust & Safety
- Corporate Security or Strategic Risk
- Due Diligence, Fraud, or Compliance Operations

These buyers already live with fragmented data, suffer from analyst thrash, and need outputs they can defend.

### Primary User

**Senior Analyst / Investigator / Research Operator / Case Lead**

Pain they experience today:
- Tab sprawl, screenshot culture, copy-paste intelligence
- Unverifiable AI synthesis mixed into evidence chains
- No durable record of how a conclusion was reached
- Slow assembly of deliverables that won't survive review

What Summit gives them:
- One place where evidence, entities, timelines, and findings live together
- Full lineage on every claim
- Collaborative review without version chaos
- Outputs that can be defended to a buyer, auditor, or regulator

---

## 5. Flagship Workflow

> **"From trigger to defensible case brief"**

This is the operating loop Summit is built around. Every demo, design decision, and roadmap item traces back to it.

### A. Intake
A user starts with a trigger: a person, company, event, threat report, allegation, anomaly, or research question.

### B. Collection
Summit ingests from structured and unstructured sources:
- Web / OSINT, uploaded documents, transcripts, internal notes
- Machine signals, alerts, public records, APIs, external feeds, social content

### C. Resolution
Summit resolves across inputs:
- Entities, aliases, locations, timelines, relationships
- Claims, contradictions, confidence, provenance

### D. Analysis
Analysts traverse the graph, inspect evidence, compare hypotheses, surface patterns, build narratives, and test assumptions — assisted by copilots and agent workflows.

### E. Governance
Every inference is tied to:
- Source lineage and confidence
- Transformation and action history
- Policy constraints and review status

### F. Output
Summit produces:
- Decision memos, case files, briefs, evidence bundles
- Watchlists, alerts, shareable visual narratives
- Explainable recommendations

### G. Ongoing Operation
Cases remain live:
- New evidence rehydrates existing cases
- Agents continue monitoring workflows
- Alerts fire on meaningful change
- Historical reasoning stays inspectable

---

## 6. Core Object Model

Summit is organized around durable objects a team returns to every day — not around tools, tabs, or model names.

| Object | Description |
|---|---|
| **Case** | The unit of work. Where investigation, collaboration, and output live. |
| **Entity** | A resolved person, organization, location, asset, or concept. |
| **Event** | A time-anchored occurrence linked to entities and sources. |
| **Claim** | An assertion drawn from evidence, with confidence and lineage. |
| **Source** | An origin of evidence: document, feed, URL, upload, API. |
| **Evidence** | A specific artifact supporting or refuting a claim. |
| **Workflow** | A repeatable, governed sequence of ingestion, analysis, or monitoring steps. |
| **Finding** | A synthesized conclusion tied to evidence and ready for review. |
| **Decision** | An output action or judgment produced from findings. |

This grammar determines UX, API design, and data architecture.

---

## 7. AI Doctrine

Summit's AI behavior is non-negotiable.

| Rule | Meaning |
|---|---|
| **AI is not the source of truth** | It is an acceleration layer over evidence. |
| **Agents are not autonomous authorities** | They are bounded operators acting on governed data. |
| **Synthesis is never detached from provenance** | Every claim must trace to its source. |
| **Human review is first-class in high-stakes decisions** | The goal is faster, better judgment — not blind automation. |

> **Automation without evidence is noise.**
> **Graphs without workflow are inert.**
> **Intelligence without action is unfinished.**

This doctrine is Summit's strategic differentiator against tools that over-index on "ask AI anything." That works in demos. It fails in serious environments.

---

## 8. Platform vs. Application

Summit has both. The product leads with the application.

### Application (what users experience)
- Case workspace
- Investigation timeline
- Source / evidence browser
- Graph exploration
- Analyst copilots
- Report / brief builder
- Decision memo generation
- Collaboration and review
- Watchlists and dossiers
- Alerts and monitoring

### Platform (why the application is superior)
- Ingestion and entity resolution
- Graph storage and traversal
- Workflow runtime and agent orchestration
- Governance, provenance, and policy engine
- Evidence contracts and deterministic artifacts
- APIs, connectors, evaluation, deployment

> Summit should feel like a **case-first intelligence environment**, not an infrastructure console.

---

## 9. Product Surface Hierarchy

Not all surfaces are equal. Design and roadmap investment must follow this hierarchy.

### Tier 1 — Core Operational
Case workspace · Evidence/source pane · Timeline · Graph view · Findings/claims · Watchlist/monitoring

### Tier 2 — Acceleration
Analyst copilot · Agent workflows · Recommended next steps · Auto-brief generation · Contradiction detection · Anomaly surfacing

### Tier 3 — Governance
Provenance inspector · Claim lineage · Review/approval queues · Evidence bundle export · Policy status · Access controls

### Tier 4 — Platform/Admin
Connector management · Ontology configuration · Workflow builder · Policy engine · Model/eval admin · Org settings

Tier 1 must be excellent before Tier 4 is polished.

---

## 10. Value Ladder

Summit creates value in compounding layers. Each layer justifies the next.

| Layer | Value |
|---|---|
| **1. Consolidation** | All relevant signals and evidence in one system |
| **2. Structure** | Messy data resolved into entities, events, claims, timelines |
| **3. Understanding** | Patterns, contradictions, relevance, and risk made visible |
| **4. Trust** | Every conclusion inspectable, sourced, and reviewable |
| **5. Action** | Intelligence turned into decisions, cases, alerts, workflows |
| **6. Scale** | Agents and automation applied without sacrificing traceability |

Competitors skip from Layer 1 to a generated summary. That is the gap Summit closes.

---

## 11. Packaging Model

| Module | Contents |
|---|---|
| **Core** | Case workspace, entity resolution, graph, sources, evidence, findings, exports |
| **Monitoring** | Watchlists, alerts, rehydration, continuous case updates |
| **Automation** | Agent workflows, assisted analysis, report generation, ingestion automations |
| **Governance** | Provenance, access control, policy, review workflows, deterministic evidence bundles |
| **Platform / Enterprise** | APIs, connectors, ontology customization, deployment options, admin, integrations |

---

## 12. Moat Statement

Summit's moat is not a single feature. It is the interaction of properties that are hard to copy independently and nearly impossible to copy together.

| Property | Why it is hard to copy |
|---|---|
| **Evidence-native architecture** | Most systems bolt provenance on later. Summit makes it structural. |
| **Decision-grade explainability** | Real lineage and transformation visibility, not generic citations. |
| **Graph + workflow + AI integration** | Many have one or two; very few integrate all three coherently. |
| **Living operational objects** | Cases, dossiers, watchlists that persist, evolve, and stay defensible. |
| **Governance as product value** | Policy, review, and determinism are enabling features, not friction. |
| **Agentic scale without surrendering control** | Faster work without breaking the evidence chain. |

**In buyer language:** Summit produces trusted outputs, shortens investigative cycle times, reduces analyst thrash, enables better collaboration, and builds stronger audit posture — all without sacrificing human oversight.

---

## 13. Outcome Metrics

Summit claims improvements in:

- Time from trigger to usable case brief
- Analyst hours per investigation
- Source-fragmentation overhead
- Reusable evidence and case artifacts produced
- Review and approval cycle time
- Explainability and audit-readiness of conclusions
- False confidence from unsupported AI synthesis
- Continuity of ongoing monitoring without manual refresh

Features that do not improve at least one of these metrics are not near-term product priorities.

---

## 14. Why Now

Organizations making high-stakes judgments face a new compound problem:

1. **Signal volume** is exploding faster than analyst capacity
2. **Source fragmentation** is worse, not better
3. **LLMs produce plausible synthesis** but increase trust risk
4. **Institutional memory** leaves with every analyst
5. **Decision pressure** is accelerating, not slowing

LLMs increased synthesis capacity and simultaneously increased the cost of unverifiable conclusions. That creates demand for exactly the system Summit is: one that does not just produce answers, but produces **defensible intelligence**.

> The market now needs systems that can be wrong in public. Summit is built for environments where that is not acceptable.

---

## 15. RepoOS / Autonomous Engineering Positioning

Summit has strong autonomous engineering and governance capabilities (RepoOS).

**Recommended positioning:**
- RepoOS is Summit's internal operating advantage — used to build, evolve, and govern the platform itself
- It is **not** the external product identity for Summit's first market
- If explicitly productized later, it earns a separate commercial narrative

Do not ask the market to digest two platform identities at once. Lead with intelligence and investigations. Let the engineering autonomy layer show through quality and velocity.

---

## 16. 12-Month Product North Star

By end of month 12, a senior analyst at a trust & safety, intelligence, or corporate security team can:

1. **Open a case** from a trigger in under 60 seconds
2. **Ingest and resolve** sources, entities, and events from at least 5 source types without manual cleanup
3. **Traverse the evidence graph** and inspect provenance for any claim in the case
4. **Run a monitored watchlist** that fires meaningful alerts on entity changes without manual refresh
5. **Export a defensible case brief** with full evidence lineage that can survive an audit or legal review
6. **Hand a case off** to a colleague who can understand the full reasoning trail without a walkthrough

That is the product. Not the most ambitious thing Summit can become — but the thing that makes it unmistakable.

---

## Appendix: Compact Vision Statement

> **Summit is an evidence-native intelligence and investigation platform that transforms fragmented signals, sources, and machine outputs into governed, explainable, decision-grade cases, findings, and continuous monitoring workflows.**

**Wedge promise:**
From trigger to defensible case faster, with less analyst thrash and far greater trust.

**Internal doctrine:**
Evidence first. Structure second. Synthesis third. Decision last.
