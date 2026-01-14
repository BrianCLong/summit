# Evaluation and hallucination design

Summit treats evaluation and hallucination attribution as first-class features of the agentic runtime. This doc specifies the core concepts, signals, and APIs.

## 1. Goals and principles

- Measure **task success, autonomy, robustness, and safety**, not just model accuracy or token-level metrics.\[3]\[1]
- Make eval **process-aware** (trajectories, tournaments, cooperation) rather than purely outcome scalar.\[2]\[6]\[1]
- Provide structured **hallucination attribution** so failures are explainable and debuggable.\[3]

## 2. Eval primitives

### 2.1 Evaluation units

- **Run**: single execution of a workflow or task graph.
- **Trajectory**: ordered sequence of states, agent messages, tool calls, and environment responses for a run.\[6]\[1]
- **Episode**: group of runs for tournament or A/B evaluation.\[1]

Each unit receives evaluation meta scores, labels, and hallucination annotations.\[1]\[3]

### 2.2 Metrics

- **Task success**: binary or graded success indicator, plus explanation.\[1]
- **Autonomy**: degree of human intervention required (none, review, correction).\[3]
- **Robustness**: performance under perturbations (tool errors, noisy inputs, partial data).\[6]
- **Safety/security events**: policy violations, blocked actions, anomaly alerts.\[3]

## 3. Tournament-style evaluation

### 3.1 Tournament mode

Inspired by ArenaRL’s tournament-based evaluation.\[1]

- Supports **pairwise agent/workflow comparisons** on a shared task distribution.\[1]
- Stores outcomes as: “Agent A > Agent B on metric M for task T (confidence C).”\[1]

### 3.2 Process-aware comparison

- Compare entire trajectories, not just final rewards, including: plan quality, tool selection, recovery from errors, hallucination incidents.\[3]\[1]
- Allow custom **judgers** (LLM or human) to score trajectories.\[1]

## 4. RL and modular evaluation components

### 4.1 Planner–Actor–Evaluator separation

Following OpenTinker’s separation of concerns.\[4]

- **Planner**: generates or updates plans/task graphs.
- **Actor**: executes steps and tool calls.
- **Evaluator**: scores behaviors and trajectories.

Summit exposes these as pluggable components so research workflows can swap them independently.\[4]

### 4.2 Neighbor and world-model signals

- Optional **neighbor context** channel for MAS: agents can see recent neighbor actions through a controlled interface.\[5]
- **World-model eval backend**: permits running trajectories against learned environment models for offline testing.\[6]

## 5. Hallucination taxonomy and tagging

### 5.1 Taxonomy

Summit adopts the AgentHallu taxonomy for LLM-based agents.\[3]

- **Planning hallucination**: invalid or impossible plans, tasks, or subgoals.\[3]
- **Retrieval hallucination**: fabricated facts or references not supported by sources.\[3]
- **Reasoning hallucination**: logically inconsistent or unjustified conclusions.\[3]
- **Human-interaction hallucination**: misrepresenting human inputs, feedback, or approvals.\[3]
- **Tool-use hallucination**: incorrect assumptions about tool APIs, effects, or results.\[3]

### 5.2 Trace annotations

Each trajectory step can carry:

- `hallucination_type[]` (0–N of the above).\[3]
- `hallucination_confidence` (0–1).\[3]
- Optional `hallucination_detector` ID for provenance.\[3]

These annotations are queryable across runs and environments.

## 6. Hallucination detection hooks

### 6.1 Pluggable detectors

Summit exposes a **Hallucination Checker API**:

- Detectors receive a window of trajectory state and can emit annotations.\[3]
- Multiple detectors can run in parallel (rule-based, LLM-based, statistical).\[3]

### 6.2 Integration with safety and policies

- Policy engine can act on hallucination signals:
  - Require human confirmation above a threshold.
  - Block tool calls or external actions when hallucination risk is high.\[3]
- Hallucination events are aggregated into safety dashboards and reports.\[3]

## 7. Cooperation and exploration metrics (MAS)

### 7.1 Exploration logging

- Log exploration parameters (e.g., temperature, epsilon) and policy type (shared vs separate) for MAS runs.\[2]
- Mark steps where exploration caused deviation from greedy policy.\[2]

### 7.2 Cooperation signals

- Metrics such as joint vs individual reward, conflict events, or resource competition events.\[2]
- Used to study how exploration affects cooperation, especially in shared-policy settings.\[2]

## 8. APIs and storage

### 8.1 Storage model

- All eval and hallucination data is stored in **trace records**: runs, trajectories, episodes, metrics, annotations.\[1]\[3]
- Designed for querying across agents, tools, deployments, and time.\[3]

### 8.2 External access

- API endpoints and SDK helpers for:
  - Submitting custom evaluators and detectors.\[1]\[3]
  - Exporting annotated traces for research or external analysis.\[6]\[3]

***

Sources
\[1] ArenaRL: Scaling RL for Open-Ended Agents via Tournament ... <https://huggingface.co/papers/2601.06487>
\[2] How Exploration Breaks Cooperation in Shared-Policy Multi-Agent ... <https://arxiv.org/abs/2601.05509>
\[3] Benchmarking Automated Hallucination Attribution of LLM-based ... <https://www.arxiv.org/abs/2601.06818>
\[4] OpenTinker: Separating Concerns in Agentic Reinforcement Learning <https://www.chatpaper.ai/dashboard/paper/1e1b2f8e-aa08-497d-ba28-45a711a103a6>
\[5] Multiagent Reinforcement Learning with Neighbor Action Estimation <https://www.arxiv.org/abs/2601.04511>
\[6] Puzzle it Out: Local-to-Global World Model for Offline Multi-Agent ... <https://papers.cool/arxiv/2601.07463>
