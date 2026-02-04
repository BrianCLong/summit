
# Playbook: Doppelgänger-Class Operation Detection

**Target:** Multi-vector Disinformation Campaigns (e.g., Russian "Doppelgänger")
**Classification:** State-Aligned, High-Volume, Cross-Platform

## Campaign Signature
*   **Technique:** Typosquatting legitimate media (e.g., `bild.ltd` vs `bild.de`).
*   **Amplification:** "Burner" accounts sharing links to these fake sites.
*   **Content:** Anti-Ukraine, Anti-Western narratives framed as "concerned citizen" reporting.

## Automated Response Sequence

### Phase 1: Early Detection (Weak Signals)
*   **Trigger:** Creation of domains resembling high-authority allow-list sites.
*   **Detector:** `DomainFuzzyMatch` (External) + `SwarmDetector` (Internal).
*   **Action:** Tag `PropagationPath` as `suspicious_origin`.

### Phase 2: Swarm Activation
*   **Trigger:** Sudden burst of accounts sharing the URL with high semantic divergence (AI-generated summaries).
*   **Metric:** `SwarmSignature.metrics.temporalCoordination` > 0.8.
*   **Action:** Flag `ActorClass` as `SWARM_NODE` for all participants.

### Phase 3: Narrative Crystallization
*   **Trigger:** Narrative jumps from "Burner" ring to "Bridge" accounts (Useful Idiots).
*   **Metric:** `PropagationPath.pathTopology` shifts from `mesh_flood` to `viral_tree`.
*   **Action:** Generate `NarrativeUnit` alert with "Legitimization Risk" warning.

### Phase 4: Censorship Interaction
*   **Scenario:** Platform bans the domains.
*   **Analysis:** Monitor `SuppressionInteraction`. Check for "Streisand Effect" (Rebound) via screenshots or text-only variants.

## Mitigation Recommendations
1.  **Do not engage** with swarm nodes (feeds algorithm).
2.  **Expose the network**, not the content (share the graph, not the lie).
3.  **Pressure upstream**: Report domain registrars.
