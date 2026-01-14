# Summit Research Reading Stack

This is the authoritative research reading stack and explicit architectural design influences ("Steal for Summit") for the project.

## Steal for Summit

### Batch: Scaling, RL, Hallucination, and Co-creation (Jan 2026)

**Focus:** Training/eval harness, hallucination attribution, human-in-the-loop ideation.

1.  **ArenaRL: Scaling RL for Open-Ended Agents via Tournament-Based Evaluation** (2601.06487, Jan 13)
    - *Steal:* Tournament-style evaluation for open-ended tasks; pairwise trajectory comparisons as first-class eval artifacts.
    - [Paper](https://huggingface.co/papers/2601.06487)

2.  **OpenTinker: Separating Concerns in Agentic Reinforcement Learning** (2601.08219 / 2601.082xx, Jan 11)
    - *Steal:* Explicit modularity: `Planner`, `Actor`, `Evaluator` separation in agent config.
    - [Landing](https://www.chatpaper.ai/dashboard/paper/1e1b2f8e-aa08-497d-ba28-45a711a103a6)

3.  **Multiagent Reinforcement Learning with Neighbor Action Estimation** (2601.04511, Jan 7)
    - *Steal:* "Neighbor Context" channel for coordination without full state sharing; privacy-aware sharing policies.
    - [Paper](https://arxiv.org/abs/2601.04511)

4.  **Puzzle it Out: Local-to-Global World Model for Offline Multi-Agent RL** (2601.07463, Jan 11)
    - *Steal:* World models trained on offline traces for safe pre-deployment simulation.
    - [Paper](https://papers.cool/arxiv/2601.07463)

5.  **AgentHallu: Benchmarking Automated Hallucination Attribution of LLM-based Agents** (2601.06818, Jan 10)
    - *Steal:* Hallucination taxonomy (Planning, Retrieval, Reasoning, Interaction, Tool-use) and per-step attribution hooks.
    - [Paper](https://www.arxiv.org/abs/2601.06818)

6.  **Progressive Ideation using an Agentic AI Framework for Human-AI Co-Creation** (2601.00475, Dec 31 / Jan index)
    - *Steal:* Progressive ideation workflow (Generate -> Critique -> Refine -> Select); `Critic` agent role; interaction telemetry.
    - [Paper](https://arxiv.org/abs/2601.00475)

7.  **How Exploration Breaks Cooperation in Shared-Policy Multi-Agent Systems** (2601.05509, Jan 8)
    - *Steal:* Explicit logging of exploration parameters and policy modes (shared vs separate) to analyze cooperation stability.
    - [Paper](https://arxiv.org/abs/2601.05509)

## Previous Batches

*(To be populated from historical records)*
