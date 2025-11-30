# R1 Rapid Attribution: 6-Week Battle Plan

## 1. The Kill Team

**Assigned Owners:**

* **Battle Captain / PM** – Owns R1 Rapid Attribution outcome, not Gantt charts.
* **Tech Lead (Platform/Backend)** – Owns auth, tenants, ingest, graph API.
* **Tech Lead (AI/Analytics)** – Owns NL→query, GraphRAG, runbook logic.
* **Design Lead** – Owns tri-pane UI + case workflow.
* **Security/Governance Rep** – Owns policy, audit, “are we allowed to ship this”.

**Team Structure:** 5–8 core people, daily standup.

---

## 2. 6-week battle plan for R1: Rapid Attribution

### Weeks 1–2: Skeleton + “empty” workflow

**Goal:** You can “play the movie” of Rapid Attribution end-to-end with mocks.

**Build:**

1. **Auth + Tenants + Cases (thin)**
   * Sign in (even if it’s just password/OIDC dev).
   * Create tenant.
   * Create case, assign users.

2. **Graph + Data Model (thin)**
   * Implement core types: Indicator, Asset, Org, Campaign, Document, Case.
   * REST/GraphQL endpoints to:
     * upsert entities
     * add edges
     * fetch neighborhood by Case.

3. **Ingest v0 (mock + CSV)**
   * Upload CSV of indicators into a Case.
   * Store as entities in graph with provenance stubs.

4. **UI shell**
   * Case list → Case detail
   * Empty tri-pane (graph/timeline/map) wired to mocked data.

**Definition of done:**
You can create a case, upload a CSV of IOCs, see them as nodes in a graph pane, all behind login.

---

### Weeks 3–4: Real data, real graph, first copilot

**Goal:** A CTI analyst can load real-ish data and see a usable campaign graph.

**Build:**

1. **STIX/TAXII connector**
   * Pull from one real CTI source.
   * Normalize into your canonical model.
   * Write provenance records per indicator/document.

2. **Graph logic**
   * Stitch infra: indicators with shared IP/domain/cert into `Campaign` subgraphs.
   * Add basic metrics (degree, simple centrality).
   * Add time properties and timeline rendering.

3. **Tri-pane UI v1**
   * Graph: pan/zoom, select node, filter by type.
   * Timeline: events/observations, brushing updates graph.
   * Map: coarse geolocation (country/region is fine).

4. **Copilot v0**
   * NL → query preview for a *small* set of intents:
     * “Show indicators for Campaign X in last 30 days.”
     * “Show all infra linked to org Y.”
   * Execute after user confirms.

**Definition of done:**
From login, an analyst imports from the CTI feed into a Case, gets a campaign graph, filters and explores infra, and can run at least 2 NL queries.

---

### Weeks 5–6: Runbook R1 + Report generation

**Goal:** One-click Rapid Attribution flow that outputs a draft brief with citations.

**Build:**

1. **Runbook engine v1 (R1 only)**
   * Orchestrate steps:
     1. Ingest + normalize indicators for Case.
     2. Build/refresh campaign graph.
     3. Tag TTPs where possible.
     4. Compute key nodes.
     5. Hand off to copilot for narrative draft.
   * Persist each step’s inputs/outputs in a log.

2. **Evidence-first GraphRAG**
   * Retrieval constrained to:
     * this Case’s docs
     * this Case’s subgraph
   * Response must:
     * cite documents/indicators
     * link to nodes in UI.

3. **Attribution brief template**
   * Sections:
     * Summary
     * Likely attribution + confidence
     * Alternate hypotheses
     * Key evidence (linked)
     * Gaps / unknowns
   * Copilot fills; analyst edits and exports (PDF/Markdown).

4. **Audit + governance pass**
   * Every query + AI call logged with:
     * user, case, time
     * scope of data
   * Basic policy labels attached to entities and checked at read.

**Definition of done:**
Given a new batch of indicators, an analyst can run “Rapid Attribution”, explore the generated campaign graph, and export a human-readable, cited brief for a stakeholder.

---

## 3. Metrics

* **T1:** Time from indicators ingested → first campaign graph visible.
* **T2:** Time from indicators ingested → draft attribution brief exported.
* **C1:** % of claims in brief with at least one provenance citation.
* **U1:** # of times copilot suggestions are accepted vs. edited/rejected.

**Goal:** Trending down (time) and up (coverage/usage) by the end of week 6.
