# Summit Design: Evaluation, Hallucination, and Co-creation

This document outlines the design commitments for Summit's agent evaluation, hallucination attribution, and human-in-the-loop workflows, derived from Jan 2026 research on scaling RL, open-endedness, and agentic frameworks.

## 1. Training and Evaluation Harness

We are moving beyond simple scalar rewards to a tournament-based, modular evaluation system.

### 1.1 Tournament-Style Evaluation (ArenaRL)
Summit will support a **Tournament Eval** mode for open-ended tasks.
- **Mechanism:** Run agent workflows (or different versions of the same agent) against each other or baselines on the same task.
- **Signal:** Pairwise comparisons (e.g., "Agent A trajectory preferred over Agent B on Task X").
- **Artifact:** Comparison results stored as first-class evaluation artifacts in traces, enabling "Elo-style" ranking of agent capabilities over time.

### 1.2 Modular Agent Architecture (OpenTinker)
To facilitate better research and debugging, we enforce separation of concerns in the agent loop configuration:
- **Planner:** Dedicated component for generating the strategy.
- **Actor:** Component responsible for tool execution and environment interaction.
- **Evaluator:** Independent component for judging success criteria.
- **Config:** Explicit `agent-config.yaml` sections for `planning`, `acting`, and `evaluation` to allow independent swapping and ablation.

### 1.3 Neighbor-Aware Coordination (MARL)
For multi-agent scenarios, we introduce a **Neighbor Context** channel.
- **Function:** Allows an agent to receive a compressed representation of neighboring agents' recent actions (or estimates thereof) to improve coordination without full state sharing.
- **Control:** Configurable privacy levels to control sharing (e.g., `neighbor_context: "full" | "estimated" | "none"`).

### 1.4 World-Model Simulation
- **Offline Training:** Use historical Summit traces to train a "world model" that predicts environment responses.
- **Simulation Backend:** Enable a run mode where agents interact with this learned world model, allowing safe, high-volume offline training and pre-deployment testing.

## 2. Hallucination and Attribution

We adopt a structured taxonomy for hallucinations to enable systematic attribution and debugging.

### 2.1 Hallucination Taxonomy (AgentHallu)
All traces and error logs will support tagging with specific hallucination types:
1.  **Planning Hallucination:** Agent invents steps or constraints that don't exist.
2.  **Retrieval Hallucination:** Agent cites non-existent data or misinterprets retrieved context.
3.  **Reasoning Hallucination:** Logical leaps or non-sequiturs in internal thought processes.
4.  **Human-Interaction Hallucination:** Agent claims user intent or input that wasn't provided.
5.  **Tool-Use Hallucination:** Hallucinating tool capabilities, arguments, or outputs.

### 2.2 Detection Hooks
- **Architecture:** Pluggable "Hallucination Checkers" that run post-step.
- **Output:** Annotations on the trace (e.g., `hallucination_suspicion: { type: "tool-use", confidence: 0.8 }`).
- **Querying:** Support trace queries to filter by hallucination type for targeted remediation.

## 3. Human-in-the-Loop Co-creation

For creative and strategic tasks, we implement a "Progressive Ideation" framework.

### 3.1 Progressive Ideation Template
A standard workflow template for co-creation tasks:
1.  **Generate:** Agent produces initial concepts.
2.  **Critique:** Dedicated "Critic" agent reviews against constraints, risks, and feasibility.
3.  **Refine:** "Synthesizer" agent improves the concept based on critique.
4.  **Select/Approve:** Explicit human checkpoint to select or approve the direction.

### 3.2 Interaction Telemetry
- **Events:** Log specific human interventions (edits, overrides, selection choices) as high-value training signals.
- **Goal:** Use this data to fine-tune the `Generator` and `Critic` models to align with human preference in the specific domain.

### 3.3 Social/Cooperation Knobs (Shared Policy)
- **Exploration:** Explicitly log exploration parameters (temperature, epsilon) at the system level.
- **Policy Mode:** Track `shared-policy` vs. `separate-policy` execution to analyze impacts on cooperation in multi-agent dilemmas.
