# Intelgraph Swarm

**Status:** Incubation
**Owner:** Intelligence Foundry

`intelgraph-swarm` is the specialized analysis engine within Summit's Intelligence Foundry dedicated to detecting, modeling, and neutralizing AI-driven bot swarms and coordinated narrative attacks.

It moves beyond content-level detection (NLP) to **graph-level detection** (topology, time, and coordination).

## Core Capabilities

### 1. Swarm-Aware Graph Analytics
Detects coordination signals that individual posts do not reveal.
*   **Temporal Synchronization Detection**: Identifies actors acting within non-human time windows (e.g., 50 accounts posting in the same 100ms).
*   **Topological Invariants**: flags subgraphs that violate organic growth laws (e.g., "perfect clique" density without previous interaction history).
*   **Identity Drift Analysis**: Tracks vector drift in actor personas over time to detect account sales or "sleeper" activation.

### 2. Narrative Provenance Tracking
Tracks the *lineage* of belief structures.
*   **Source Attribution**: Uses causal inference to trace a viral narrative back to its Patient Zero.
*   **Mutation Tracking**: Maps how a narrative evolves (mutates) as it crosses platform boundaries (e.g., 4chan -> Twitter -> NYT).

### 3. Systemic Stress-Testing (Red Teaming)
Simulates narrative attacks against client graphs.
*   **Attack Simulation**: Deploys virtual "red agents" into a graph copy to test resilience against swarm flooding.
*   **Cascade Modeling**: Predicts the "R0" (viral reproduction number) of a specific narrative payload in a specific network topology.

## Integration

This package consumes data from `intelgraph-core` (the raw graph) and emits high-fidelity signals to `governance-engine` (for automated response).

```typescript
import { SwarmScanner } from '@summit/intelgraph-swarm';

const scanner = new SwarmScanner({
  windowSize: '500ms',
  sensitivity: 'high'
});

const verdict = await scanner.analyze(subgraph);
if (verdict.isSwarm) {
  await Governance.lockdown(verdict.actorIds);
}
```

## Roadmap

*   [ ] **v0.1**: Basic Temporal Synchronization detection.
*   [ ] **v0.2**: Narrative Lineage modeling.
*   [ ] **v1.0**: Full "Red Team" simulation capability.
