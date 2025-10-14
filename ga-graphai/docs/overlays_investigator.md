# Overlays investigator

The autonomous investigator overlay upgrades the IntelGraph ecosystem with an end-to-end swarm that can generate, validate, and execute high-confidence investigative plays without waiting for manual orchestration. It layers a patentable hypothesis engine, counterfactual simulators, and mission-sync automations on top of existing graph analytics.

## Architecture

1. **Signal fusion intake** – normalizes analyst or sensor leads into a weighted signal graph.
2. **Triangulated Hypothesis Graph (THG)** – patents a dual-centrality scorer that fuses PageRank and betweenness to rank the next best hypothesis while preserving novelty.
3. **Counterfactual Gap Mapper** – generates alternative branches if a hypothesis collapses, keeping the swarm adaptive.
4. **Mission weaver** – syncs outputs to downstream squads, ensuring differentiators are applied at the edge.

The overlay is exposed through the `autonomous-investigator` FastAPI service which materializes the plan JSON consumed by workcells.

## Patent-grade differentiators

- **Tension index control:** calculates graph tension from edge weight variance to choose resilient hypothesis paths.
- **Self-tuning assurance baseline:** enforces a floor that never drops below 0.65 even when counterfactual penalties spike.
- **Adaptive innovation vectors:** each task advertises which proprietary mechanisms (e.g., triangulated hypothesis graph, assurance spectrum weaver) it activates, creating defensible IP claims.

## Interfaces

- `POST /investigator/plan` – builds an end-to-end plan including hypotheses, autonomous tasks, differentiators, and counterfactual safety rails.
- `GET /health` – readiness probe used by mission control.

## Competitive impact

This overlay gives IntelGraph customers:

- Fully autonomous investigation workcells that can branch and self-heal.
- Quantified patent evidence through explicit differentiators and innovation vectors.
- Assurance scoring that satisfies compliance auditors while enabling aggressive threat hunts.
