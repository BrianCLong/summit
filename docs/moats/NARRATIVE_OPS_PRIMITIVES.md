
# NarrativeOps Primitives

**Authoritative Definitions for Summit Narrative Intelligence**
*Version 1.0 - 2026-01-26*

This document defines the atomic units used by Summit to model, detect, and counter influence operations. These primitives supersede unstructured text analysis.

## 1. Narrative Unit
The atomic payload of an influence operation. Unlike a "topic," a narrative unit contains specific intent and framing.

*   **Structure:**
    *   `Semantic Frame`: The cognitive lens (e.g., "The West is failing," "Immigrants are invaders").
    *   `Intent`: The operational goal (e.g., Demoralize, Distract, Radicalize).
    *   `Stance`: Polarity towards the subject.
    *   `Themes`: Broader semantic categories.

## 2. Propagation Path
The topology of spread through the network graph.

*   **Topologies:**
    *   `Broadcast`: One-to-many (State Media).
    *   `Viral Tree`: Organic, branching spread.
    *   `Mesh Flood`: Swarm-like, multi-node simultaneous injection.
    *   `Bridge Crossing`: Movement from one community bubble to another.

## 3. Actor Class
The nature of the entity propagating the narrative.

*   **Classes:**
    *   `HUMAN`: Organic, low coordination.
    *   `BOT_SIMPLE`: Rule-based, high repetition.
    *   `SWARM_NODE`: AI-driven, high coordination, high semantic diversity.
    *   `CYBORG`: Human augmented by tools.
    *   `STATE_ACTOR`: Attributed to nation-state apparatus.

## 4. Amplification Signature
Metric fingerprint of artificial boosting.

*   **Metrics:**
    *   `Synchronicity`: Temporal alignment of actions.
    *   `Semantic Divergence`: Extent of rewording (Low = Paste, High = AI).
    *   `Velocity`: Spread rate relative to organic baselines.

## 5. Suppression Interaction
The dynamic relationship between governance actions and narrative spread.

*   **Dynamics:**
    *   `Rebound`: Post-suppression velocity > Pre-suppression velocity.
    *   `Reinforcement`: Censorship validates the narrative frame ("They don't want you to know").
