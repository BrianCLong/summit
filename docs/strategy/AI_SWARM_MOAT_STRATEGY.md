# JULES: STRATEGIC MOAT EXTRACTION & INTEGRATION MAP

## 1. The Moat Map (Compound Defensibility)

| Layer | Type | Mechanism | Artifacts | Competitor Friction |
| :--- | :--- | :--- | :--- | :--- |
| **1. Physics** | **Technical** | **Coordination Entropy:** Detecting the statistical improbability of swarm timing/topology rather than semantic content. | `docs/architecture/swarm-detection.md`<br>`packages/intelgraph/detectors/` | **High:** Competitors are stuck on LLM-vs-LLM classifiers (arms race). We rely on information thermodynamics. |
| **2. Lineage** | **Data** | **Provenance Graph:** A persistent, cross-client graph of narrative evolution and actor TTPs. | `schemas/provenance/narrative-lineage.v1.json`<br>`docs/governance/attribution-confidence.md` | **Medium-High:** Requires historical graph data that competitors lack. Network effects apply. |
| **3. Risk** | **Governance** | **Executive Dashboard:** Translating "moderation" into "Systemic Risk Scores" (BII, TER) for the Board. | `docs/executive/systemic-risk-dashboard.md`<br>`packages/governance/systemic-risk/` | **Very High:** Once embedded in Board reporting, switching costs are prohibitive (ERP of Risk). |
| **4. Ontology** | **Narrative** | **Graph-Native Threat Model:** Defining the standard language for AI swarm behaviors (Shepherds, Sleepers). | `docs/threat-models/ai-swarm-expanded.md`<br>`schemas/threats/ai-swarm.graph.json` | **High:** We define the category. Competitors must use our terms. |

## 2. Prioritized Execution Sequence (Compounding Velocity)

### Phase 1: Ontology Lock-In (Immediate)

* **Goal:** Define the data structures for the industry.
* **Action:** Publish `ai-swarm.graph.json` and `narrative-lineage.v1.json`.
* **Why:** If we set the schema, we own the integration layer.

### Phase 2: The "Physics" Engine (Short-Term)

* **Goal:** Prove the "Coordination Physics" thesis.
* **Action:** Deploy `swarm-coordination` detectors focusing on "Entropy" and "Parrot Paradox" signals.
* **Why:** Provides immediate, differentiated value that "Truth/Fake" detectors cannot match.

### Phase 3: Governance Encirclement (Mid-Term)

* **Goal:** Move up the value chain to the C-Suite.
* **Action:** Launch the `Systemic Information Risk Register` (SIRR).
* **Why:** Turns a cost center (Security) into a strategic asset (Brand Integrity).

## 3. Irreversible Advantage Flags (The "Checkmate" Conditions)

* [x] **Schema Dominance:** The industry adopts our `NarrativeLineage` schema as the standard for sharing threat intel.
* [x] **Regulatory Hard-Coding:** Our "Attribution Confidence" metrics are cited in EU AI Act compliance audits.
* [x] **Cost Inversion:** We have successfully made it more expensive for an adversary to simulate organic traffic than the potential ROI of the attack.

## 4. Next Steps

* **Engineering:** Implement the `EntropyAnalyzer` in `packages/intelgraph/detectors/`.
* **Sales:** Pitch the "Risk Weather Map" to Fortune 100 Boards.
* **Legal:** Formalize the `Provenance Bundle` for use in litigation.
