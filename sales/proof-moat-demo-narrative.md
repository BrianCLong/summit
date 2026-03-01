# Proof Moat Demo Narrative: Defensibility Over Discovery

**Owner:** Jules
**Target Audience:** CISOs, Chief Risk Officers, Boards, Regulators (Financial Services)
**Goal:** Demonstrate Summit's unique ability to provide explainable, reproducible, and verifiable intelligence decisions—the "Proof Moat."

## 1. The Setup: The "Black Box" Problem
*   **Acknowledge the Status Quo:** "You likely subscribe to premium CTI feeds (like Recorded Future). They provide immense breadth and continuous alerts. But when a critical alert hits—or worse, after a breach—how do you prove *why* you prioritized one vulnerability over another?"
*   **Highlight the Regulatory Pain:** "Regulators (SEC, PRA, OCC) don't just want to know you have threat intel. They want to see the exact data chain and logic that led to a specific decision on a specific date. A generic 'Risk Score: 85' doesn't survive audit."
*   **The Summit Difference:** "Summit is not another feed. It's the **governance OS** that sits on top of your existing intelligence. We turn alerts into unassailable, mathematically verifiable proof."

## 2. The Demonstration: Deterministic Intelligence
*   **Show Ingestion (The "Any Source" Hook):** Briefly show Summit ingesting a generic threat feed (e.g., an FS-ISAC alert or a simulated RF feed).
*   **The Scoring Blueprint (FS-Native):** Instead of a generic score, show Summit applying a custom, version-controlled policy.
    *   *Visual:* An OPA policy defining a "Regulatory Exposure Modifier" and "Revenue-impact Asset Mapping" against the ingested threat.
    *   *Voiceover:* "We map the threat directly to your enterprise risk framework. This isn't our black box; it's your specific, board-approved logic."
*   **The "Proof Moat" Action:** The core of the demo.
    *   *Action:* Trigger a report generation or orchestration action based on the scored threat.
    *   *Visual:* The generation of a **Deterministic Report Hash** and a **Signed Bundle**.
    *   *Voiceover:* "This is the 'Proof Moat.' For every decision, Summit generates a cryptographically signed artifact. It contains the exact input data, the exact version of the scoring policy used, and the resulting action."
*   **EVID Tagging:** Show how the resulting intelligence is tagged with EVID identifiers (e.g., `EVID-SUM-1234`), linking the output to the precise, immutable inputs.

## 3. The Climax: The Regulator Replay
*   **The Scenario:** "Imagine it's six months later. An auditor asks: 'Why didn't you patch this system immediately?'"
*   **The Replayable Pipeline:**
    *   *Action:* Input the EVID or Report Hash from the previous step.
    *   *Visual:* Summit perfectly reconstructs the intelligence state from that exact moment in time.
    *   *Voiceover:* "Because we use replayable pipelines and persistent orchestration state, you don't guess. You show the auditor the exact snapshot of what was known, what the policy dictated, and the deterministic proof that you followed it."

## 4. The Close: Hybrid Sovereignty
*   **Data Locality:** "And because we know your data is sensitive, this entire process—the graph, the LLMs, the policies—can run entirely within your VPC or on-prem. No telemetry egress. Complete sovereignty."
*   **Call to Action:** "Don't replace your feeds. Govern them. Let Summit make your intelligence regulator-ready."
