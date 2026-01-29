# OSINT Roadmap Recommendations

**Date:** 2026-01-25
**Source:** Automation Turn #4 Signals
**Context:** Strategic roadmap adjustments based on external platform signals (Maltego, i2, 1 TRACE).

## 1. GA-Neutral (No Change Required)

These capabilities are "table stakes" where Summit is already well-positioned. No roadmap deviation needed for GA.

* **Browser-Native Core:** Continue with current React/WebGL frontend. The shift of Maltego to "Maltego One" (browser) validates our architectural choice.
* **Graph-First Architecture:** Continue with Neo4j as the primary store. The market's reliance on link analysis confirms the graph model is correct.

## 2. Post-GA Enhancements (Backlog)

These features should be scoped for Post-GA releases to close specific functional gaps.

* **Feature: Expanded OSINT Connector Library**
  * **Justification:** Competitors (ShadowDragon, Social Links) have massive connector libraries. We need to match key "high-signal" sources.
  * **Action:** Prioritize 3-5 high-value OSINT connectors (e.g., DomainTools, customized Social scraper) for Q1 Post-GA.
  * **Risk:** P2 (High effort, medium strategic value).

* **Feature: "Collection State" UX Tracking**
  * **Justification:** User friction in moving from "foraging" (collection) to "analysis". We need to better track session state (as mandated by Turn #5).
  * **Action:** Implement "Session State" tracking in `IntelGraph` UI to record "paths taken" and "dead ends".
  * **Risk:** P1 (Medium effort, high usability impact).

## 3. Strategic Differentiators (Moat Builders)

These are high-priority initiatives that actively widen the gap with competitors.

* **Initiative: "Immutable Evidence Packs" (Export)**
  * **Justification:** Turn our `ProvenanceLedger` advantage into a portable asset. Competitors export mutable files; we export verifiable truth.
  * **Action:** Design a cryptographic export format that packages graph data + ledger history + signatures.
  * **Risk:** P0 (High strategic value, complex implementation).

* **Initiative: Automated Contradiction Detection**
  * **Justification:** Use the graph to automatically flag conflicting intelligence (Turn #5). This is a "science over art" capability competitors lack.
  * **Action:** Develop graph traversal rules to identify mutually exclusive claims (e.g., spatiotemporal conflicts).
  * **Risk:** P1 (High complexity, high value).
