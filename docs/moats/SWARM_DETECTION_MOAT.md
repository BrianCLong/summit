
# Swarm Detection Moat Strategy

**Strategic Advantage: Coordination Physics**
*Based on Automation Turn #4 (2026-01-26)*

## The Problem: AI Bot Swarms
Traditional bot detection relies on "Account Heuristics" (creation date, default avatar, posting frequency). AI Bot Swarms defeat this by:
*   Using aged accounts.
*   Generating unique, context-aware text (High Semantic Divergence).
*   Mimicking human sleep/wake cycles.

## The Summit Solution: Coordination Physics
We do not detect *bots*; we detect *coordination*. No matter how human an individual bot looks, a swarm *must* coordinate to achieve its goal. This coordination leaves a mathematical trace in the system's entropy.

### Detection Vectors

1.  **Temporal Micro-Bursting**
    *   **Signal:** Accounts posting on the same narrative within a statistically improbable time window (milliseconds to seconds), even if content differs.
    *   **Metric:** Coefficient of Variation (CV) of inter-arrival times. Organic = High CV (Burst/Pause). Swarm = Low CV (Machine Clock) or Ultra-High synchronization (Simultaneous).

2.  **Semantic Divergence vs. Intent Convergence**
    *   **Signal:** A group of actors expressing the *exact same intent* (vector direction) using *maximally different vocabulary* (vector magnitude).
    *   **Metric:** High Intent Similarity + High Lexical Divergence. Humans usually reuse vocabulary (memes/slogans). AI swarms over-optimize for uniqueness to evade filters.

3.  **Network Topology Inversion**
    *   **Signal:** Information flowing *inward* from unconnected leaf nodes to a center, rather than outward from an influencer.
    *   **Metric:** Inverted PageRank flow.

## Implementation Status
*   **Detector:** `server/src/influence/detection/swarm_signature.ts`
*   **Primitives:** `server/src/narrative/primitives.ts`
