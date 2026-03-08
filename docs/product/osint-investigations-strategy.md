# Product Strategy & Battlecards: OSINT Investigations Subsumption

## 1. Positioning
* **vs. ShadowDragon (Horizon):** ShadowDragon emphasizes OPSEC and lawful collection. Summit matches this with code-enforced, audit-grade governance but obsoletes them with deterministic, agentic playbooks that automate the entire investigation cycle.
* **vs. Social Links (Crimewall/API):** Social Links excels at data breadth and UX. Summit subsumes their API as a connector, replicates the graph/table UX, but surrounds it with an "Evidence Ledger" and policy engine they lack, turning ad-hoc scraping into reproducible casework.
* **vs. Maltego:** Maltego is the standard for manual link analysis. Summit leapfrogs it by treating the investigation as code: agents build the graph deterministically, allowing for replay, policy-aware redaction, and automated evidence generation.
* **vs. Recorded Future:** Recorded Future provides an intelligence graph feed. Summit integrates this feed but competes by offering the *workspace* where that intelligence is fused with internal data and governed by customer-specific playbooks.
* **vs. Palantir:** Palantir is a generalized operational platform. Summit provides an *investigation-native* schema out-of-the-box, optimized for the evidentiary rigor and determinism required by intelligence and compliance teams, without the massive integration overhead.

## 2. Feature Deltas to "Obsolete" Competitors
* **Deterministic Replay (vs. all):** The ability to rerun an investigation byte-for-byte, proving exactly how a conclusion was reached.
* **Code-Enforced Governance (vs. ShadowDragon/Social Links):** Policies (e.g., ToS limits, "no mass scraping") are enforced at the tool adapter level, not just as written guidelines.
* **Automated Evidence Ledger (vs. Maltego):** Every node and edge automatically points to immutable evidence artifacts (`report.json`, `stamp.json`), eliminating manual reporting toil.

## 3. Packaging & Pricing Posture Recommendations
* **SaaS Tiers:**
    * **Standard:** Access to the platform, core playbooks, and open/free connectors (e.g., SpiderFoot adapter).
    * **Enterprise:** Advanced governance controls, custom playbooks, on-prem/VPC deployment options, and premium connector integrations (customer brings their own API keys for Social Links, Orpheus).
* **Do Not Invent Proprietary Pricing:** Do not resell data or API calls (e.g., Social Links API). Summit is the operating system; the customer manages their own data subscriptions.

## 4. Roadmap Mapped to PRs
* **PR-1 & PR-2 (Foundation):** Evidence framework, CI gates, and Tool Adapter SDK. (The "Ledger").
* **PR-3 & PR-4 (Breadth & UX):** SpiderFoot adapter (open sources) and Crimewall/Maltego UX parity layer (Graph/Table/Report). (The "Workbench").
* **PR-5 & PR-6 (Interoperability & Premium Data):** Maltego import/export and Social Links feature-flagged connector. (The "Ecosystem").
* **PR-7 & PR-8 (Specialized Workflows):** Orpheus (threat scoring) and Oceanir (media verification). (The "Analytic Edge").

## 5. Three "Impossible-for-Them" Features
1. **Time-Travel Graph Queries:** Because every edge has an immutable provenance envelope, investigators can query the graph as it existed at any specific timestamp, proving exactly what was known when a decision was made.
2. **Policy-Aware Automated Redaction:** A report can be instantly regenerated for different audiences (e.g., legal, public, internal) based on redaction policies applied at the graph level, governed by the data's original ToS or classification.
3. **Cross-Case Agent Swarms:** Agents can identify patterns across hundreds of isolated cases without violating compartmentation boundaries, surfacing high-level strategic intelligence while maintaining strict access controls on the underlying evidence.

## 6. Two Architecture Leaps
1. **The Evidence Ledger:** Moving from "saving a file" to a cryptographically verifiable, append-only log of every step, tool call, and state mutation (`SUM-EV1::...`).
2. **Deterministic Agent Runtime:** Enforcing that LLM-driven playbooks yield the exact same graph and report given the same inputs and tool outputs, eliminating the "black box" problem of current AI copilots.

## 7. Workflow Redesign: Investigation-as-Code
* Shifting from a manual "click-and-pivot" workflow to defining an investigation as a declarative playbook. The investigator defines the goal, the agent executes the tools, handles rate limits and ToS, and constructs the graph, leaving the investigator to review the deterministic evidence and make the final analytical judgment.

## 8. AGIR Benchmark Narrative
* **Audit-Grade Investigation Reproducibility (AGIR):** Regulators and enterprise compliance teams no longer have to trust a vendor's claims or an analyst's memory. The AGIR benchmark proves that Summit's outputs are 100% reproducible, mathematically linking every report claim to its source data, policy checks, and execution context.
