# Strategic Directive: Frame-First Narrative Warfare Defense
**Date:** 2026-01-27
**Scope:** Narrative Engine, OSINT, Governance, IntelGraph
**Status:** DIRECTIVE

## 1. Executive Summary
Research from 2026-01-27 confirms a structural shift in influence operations:
1.  **From Claims to Frames:** Influence is now driven by stable "interpretive frames" (e.g., inevitability, decline) rather than falsifiable claims.
2.  **From Bots to Hybrids:** Coordination relies on "Human-AI Hybrids" and role-based consistency, not just bot volume.
3.  **From Spikes to Drift:** Success is measured in "baseline drift" over months, not viral spikes.

**Summit Response:** We are pivoting from "Claim-Centric" to "Frame-First" analysis. We will treat narratives as evolving structures with invariant cores, and actors as dynamic roles within a temporal graph.

---

## 2. Capability Superset Matrix

| Legacy Capability | Summit Primitive | Summit Superset Implementation |
| :--- | :--- | :--- |
| **Claim Checking** | `NarrativeFrame` | **Invariant Core Extraction**: We extract the latent frame (e.g., "Institutional Betrayal") regardless of the specific topic/claim surface. |
| **Bot Detection** | `ActorRole` | **Temporal Role Ontology**: Actors are classified as `INITIATOR`, `VALIDATOR`, or `AMPLIFIER` based on graph position and time-delay distributions, not just user-agent strings. |
| **Virality/Spike Alerts** | `BaselineDrift` | **Drift Analytics Engine**: We monitor the *second derivative* of discourse baseline over rolling 30-90 day windows to detect "slow-burn" operations. |
| **Platform Monitoring** | `CrossPlatformGraph` | **UEF Provenance Tracking**: Using Universal Evidence Format to link narrative frames across disparate feeds (Telegram -> Twitter -> News). |

---

## 3. Architecture Delta

### A. Frame-First Knowledge Graph
*   **New Node Type:** `NarrativeFrame`
    *   Properties: `invariant_core` (text description), `embedding` (vector), `stability_score` (0-1), `lifespan` (days).
    *   Relationships: `(Post)-[:EXPRESSES]->(NarrativeFrame)`, `(NarrativeFrame)-[:EVOLVES_FROM]->(NarrativeFrame)`.

### B. Behavioral Role Engine
*   **New Actor Attribute:** `role`
    *   Dynamic calculation based on `interaction_delay` and `centrality` within a specific `NarrativeFrame`.
    *   *Initiator*: Zero-delay, high-novelty.
    *   *Validator*: Short-delay, high-authority.
    *   *Amplifier*: Variable-delay, high-volume.

### C. Drift Detection
*   Shift from `AnomalyDetection` (outliers) to `DriftDetection` (trend change).
*   Requires long-term storage of "market state" snapshots (already in `NarrativeEngine`).

---

## 4. Moat Ledger

| Dimension | Moat Description | Strength |
| :--- | :--- | :--- |
| **Technical** | **Frame Invariant Database**: A proprietary graph of narrative frames and their mutations over time. Competitors only have "topics". | High |
| **Governance** | **Drift-Based Risk Policy**: Governance gates that trigger on *structural drift* rather than keyword hits, allowing us to flag "safe" content that serves a hostile frame. | Medium |
| **Economic** | **Long-Horizon Analytics**: Optimizing storage to make 12-month drift analysis cost-effective (using our Partitioned Event Store) where competitors cap at 30 days. | High |
| **Narrative** | **"Cognitive Security" Standard**: Defining the industry standard for "Frame-First Defense", making claim-checking look obsolete. | High |

---

## 5. Implementation Directives

### Immediate Actions
1.  **Schema Extension**: Add `NarrativeFrame` and `ActorRole` to the GraphQL schema.
2.  **Engine Update**: Update `NarrativeState` to track `Frame` saturation.
3.  **Roadmap**: Update `NARRATIVE_EARLY_WARNING.md` to prioritize `Drift` metrics over simple `Rt` calculation.
4.  **Agent Governance**: Deploy `prompts/sys/FRAME_EXTRACTION_AGENT.md` to standardize LLM analysis of frames.
5.  **CI Enforcement**: Activate `.github/workflows/narrative-governance.yml` to gate changes.

### Governance
*   **New Rule**: All "High Risk" assessments must include a `Frame Analysis` component, not just IOCs.
*   **CI Gate**: Any change to `NarrativeEngine` must verify it preserves `Frame` lineage.

---

**Authorized By:** Jules (System Architect)
**Reference:** Research Update 2026-01-27
