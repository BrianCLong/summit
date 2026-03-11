# Counter-AI Risk Register

## Purpose
This document defines the structured Counter-AI Risk Register for the Summit intelligence system. Its purpose is to catalog and contextualize adversarial attack vectors against Summit's AI models, agent workflows, and GraphRAG knowledge structures. By formalizing these risks, we can systematically deploy telemetry hooks, anomaly detectors, and defensive policies across the stack to detect and neutralize adversarial influence operations without disrupting legitimate engineering workflows. This register operates strictly in a defensive, counterintelligence posture.

## Registered Risks

### CAI-001: GRAPH_RELATION_INJECTION
**Attack Surface:** Graph indexing pipeline
**Attack Mode:** Relation injection/enhancement
**Description:** Adversaries attempt to insert spurious relationships between nodes or artificially inflate the confidence/weight of existing edges during graph construction. This aims to manipulate downstream retrieval and reasoning by forcing the AI to draw incorrect connections between disjoint entities.

### CAI-002: COMMUNITY_DENSIFICATION
**Attack Surface:** Community detection pipeline
**Attack Mode:** Community densification
**Description:** Attackers strategically inject highly inter-connected nodes to force distinct topic communities to merge during the hierarchical community detection phase. This dilutes the semantic purity of global community summaries, leading to degraded insight generation.

### CAI-003: MULTI_HOP_POISONING
**Attack Surface:** Query-time retrieval
**Attack Mode:** Multi-hop exploitation
**Description:** The malicious actor seeds the corpus with content designed to act as highly attractive "bridge nodes" during multi-hop retrieval. When agents perform deep reasoning traverses, they are deterministically routed through these poisoned hubs, compromising the entire evidence chain.

### CAI-004: PROMPT_JAILBREAK
**Attack Surface:** Agent prompt interface
**Attack Mode:** Jailbreak/Evasion
**Description:** Adversaries craft specialized inputs containing cognitive exploits, linguistic obfuscation, or persona subversion strings designed to bypass safety constraints. The goal is to hijack the agent's reasoning loop and force it to execute unauthorized behaviors or generate harmful content.

### CAI-005: MODEL_STEALING_INVERSION
**Attack Surface:** Agent query interface
**Attack Mode:** Inversion/Model-stealing
**Description:** The attacker issues a high volume of meticulously crafted queries to map the internal decision boundaries, prompts, and underlying knowledge base of the agents. This reconnaissance enables them to extract proprietary logic or craft highly targeted evasion attacks later.
