# Moat Thesis: The Fortress Strategy

**Epic:** 1 — Moat Thesis
**Status:** Active
**Owner:** Head of Product / Engineering (Agentic Proxy)
**Last Updated:** 2025-10-27

## 1. Chosen Moat Types

We are committing to two primary structural moats that reinforce each other:

1.  **Compliance & Trust (The "High-Stakes" Moat)**
    - **Thesis:** By embedding "controls-as-code", immutable audit logs (Provenance Ledger), and policy-driven data access (OPA) directly into the platform's core, we make leaving the platform a compliance risk. We sell risk reduction, not just software.
    - **Why we win:** Competitors treat compliance as a checkbox feature; we treat it as the database physics.

2.  **Data Network Effects (The "Gravity" Moat)**
    - **Thesis:** As users ingest more data (entities) and define more relationships (edges) in the Knowledge Lattice, the value of the graph grows superlinearly. The "Graph Intelligence" becomes smarter with every interaction.
    - **Why we win:** Relational-based competitors cannot easily replicate the rich, traversal-based insights of a deep graph.

---

## 2. Moat Roadmap

| Quarter     | Feature Initiative                  | Defensibility Link (The "Why")                                                                                                      |
| :---------- | :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Q4 2025** | **Provenance Ledger V2**            | **Compliance:** Creates a tamper-evident history that competitors can't match without a complete re-architecture.                   |
| **Q4 2025** | **Graph-Native RBAC (OPA)**         | **Trust:** Deepens lock-in by defining complex access policies that are hard to migrate to simpler systems.                         |
| **Q1 2026** | **"The Lattice" (Knowledge Graph)** | **Data Gravity:** Centralizes all intelligence into a single, interconnected graph, making "export to CSV" lossy and painful.       |
| **Q1 2026** | **Evidence Factory**                | **Compliance:** Automates the generation of audit artifacts, making manual alternatives feel reckless.                              |
| **Q2 2026** | **Federated Signal Sharing**        | **Network Effect:** Allows tenants to benefit from aggregate threat signals without sharing raw data, creating a defensive network. |

---

## 3. Measurable Moat Metrics

We do not measure "active users" alone; we measure **entanglement**.

1.  **Retention:** Net Revenue Retention (NRR) > 120%.
2.  **Depth of Usage:** % of queries that touch >3 degrees of the graph (indicates dependency on _our_ data model).
3.  **Integration Count:** Average number of data connectors active per tenant (Target: >5).
4.  **Data Gravity:** Ratio of _derived_ facts (system-generated) to _ingested_ facts (user-uploaded). A higher ratio means the platform is generating unique value.

---

## 4. Irreversible Steps (The Lock-In)

Customers are "locked in" (in a value-positive way) when they take these steps:

1.  **Migration of Authority:** The customer shuts down their legacy "shadow" spreadsheets and designates IntelGraph as the _System of Record_ for investigations.
2.  **Policy Encoding:** The customer translates their internal governance rules into our OPA policy language. Migrating away requires rewriting their legal rulebook.
3.  **Integration of Identity:** The customer connects their SSO/SCIM and maps their organizational hierarchy to our RBAC roles.

---

## 5. Competitor Teardown

| Competitor Type                            | Their Strength     | Where They Can Copy Fast  | Our Moat Defense                                                                                    |
| :----------------------------------------- | :----------------- | :------------------------ | :-------------------------------------------------------------------------------------------------- |
| **Generic Graph Tool (e.g., Neo4j Bloom)** | Visualization      | UI widgets, basic queries | **Provenance:** They lack the immutable audit trail and "controls-as-code" layer.                   |
| **Legacy PLM/Case Mgmt**                   | Process management | Workflow forms, approvals | **Graph Intelligence:** They are rigid relational SQL apps; they cannot do deep-link analysis.      |
| **Modern AI Wrapper**                      | Speed, UX          | "Chat with data" features | **Trust & Truth:** They hallucinate; we offer grounded, citable evidence via the Knowledge Lattice. |

---

## 6. Moat Gates

Every major release (Minor or Major version) must pass the **Moat Gate**:

- [ ] Does this release deepen reliance on the Graph or the Ledger?
- [ ] Does it make it harder (functionally or operationally) to switch to a competitor?
- [ ] Does it add a proprietary data signal?

_If the answer is "No" to all, the release is rejected or de-prioritized._

---

## 7. "No Commodity Features" Filter

We will **NOT** build:

- Generic project management (Kanban, etc.) -> Integrate Jira instead.
- Generic chat/messaging -> Integrate Slack/Teams instead.
- Basic BI/Dashboarding -> Integrate Tableau/PowerBI instead.

_Exception:_ Unless "Table Stakes" for the specific persona (e.g., a specific graph-based timeline view).

---

## 8. Ownership

- **Moat Owner:** Head of Engineering (Primary) & Head of Product (Secondary).
- **Responsibility:** Enforcing the Moat Gates and maintaining this Thesis.

---

## 9. Internal Narrative: "Why We Are Hard to Displace" (18-Month Outlook)

"In 18 months, displacing IntelGraph won't be an IT decision; it will be a Board-level risk. A competitor might offer a prettier UI or a cheaper price, but they cannot offer the _audit-proof certainty_ that our Provenance Ledger provides. Furthermore, moving away would mean losing the 'Corporate Memory' stored in the connections of the Knowledge Lattice—connections that simply don't exist in a flat SQL migration. We are not just a tool; we are the _physics_ of their intelligence operation."

---

## 10. Quarterly Moat Scorecards

- **Review Cadence:** First week of every quarter.
- **Participants:** Exec Team + Product Leads.
- **Output:** A "Moat Health Score" (1-10) for both Compliance and Data Gravity.

---

## 11. Kill List (Initiatives that weaken the moat)

- **"CSV-only" Workflows:** Any feature that encourages users to work outside the graph. (Status: **DEPRECATE**)
- **Un-audited "God Mode":** Any admin feature that bypasses the Provenance Ledger. (Status: **KILL**)
- **Loose API Tokens:** Long-lived tokens that bypass OPA. (Status: **MIGRATE to mTLS/OIDC**)

---

## 12. Interop & Integrations as a Moat ("Boring but Lethal")

**Thesis:** Deep, governed integrations make switching away operationally and politically expensive. We win by being the safest, fastest path to plug IntelGraph into the systems customers already run—then making the combined case data, policies, and graph state irreplaceable.

**Connectors (priority set):**

- **SIEM/SOAR:** Splunk, Elastic, Sentinel for bidirectional alert + enrichment loops.
- **Ticketing & ITSM:** Jira, ServiceNow for case lifecycle, approvals, and change windows.
- **Doc Stores & EDM:** SharePoint, Google Drive, Box for evidence capture with provenance stamps.
- **Data Lakes/Warehouses:** S3/Lakehouse, BigQuery, Snowflake for governed ingest/egress.
- **Identity Providers:** Okta, Entra/AD, Ping for SSO, SCIM, role mirroring, and step-up auth.

**Governance Controls:**

- Policy-as-code enforcement on every connector (OPA bundles, contract tests, and drift guards).
- Connector-level DLP/egress allow-lists; signed webhooks and request verification by default.
- Case history + lineage stamped into the Provenance Ledger; graph diffs preserved on sync.

**Switching Cost Hooks:**

- **Case History:** Full investigative timelines (tickets ↔ graph entities/edges) replayable only with our ledger.
- **Policy Bindings:** Identity + entitlements mapped to graph scopes; moving requires policy rewrites.
- **Graph State:** Enriched relationships from cross-system joins become the “source of truth” for triage/runbooks.

**Execution Outcomes (land-and-expand):**

1.  **Land:** Ship governed adapters fast with zero-trust defaults so customers keep their tools but trust our graph.
2.  **Expand:** Embed graph intelligence back into the connected systems (closed-loop actions, ticket automation, SIEM suppression).
3.  **Defend:** Benchmark integrations as SLO-backed features (uptime, drift checks, governance events) and review quarterly via the Moat Gate.
