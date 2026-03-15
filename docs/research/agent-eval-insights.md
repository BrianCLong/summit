# Agent Evaluation Insights
## Actionable Insights for Summit Bench

The rapid progression of agent frameworks necessitates a shift in how we evaluate them in Summit Bench. Single-turn instruction following is no longer sufficient.

### Emerging Evaluation Dimensions

#### 1. Multi-Agent Negotiation & Coordination
- **Metric:** *Convergence Rate* - The percentage of multi-agent tasks where the agents successfully agree on a final plan or outcome without stalling or entering an infinite loop.
- **Metric:** *Communication Efficiency* - Total tokens consumed vs. successful outcome to penalize excessive back-and-forth between agents.
- **Testing Approach:** Introduce multi-actor scenarios (e.g., a "researcher" and a "writer" agent) where the goal cannot be completed without explicit information sharing and iterative refinement.

#### 2. Tool Robustness & Error Recovery
- **Metric:** *Tool Recovery Rate* - The percentage of tasks completed successfully *after* encountering an injected tool error (e.g., simulated API timeout, malformed JSON response).
- **Testing Approach:** Datasets should include expected tools that are intentionally designed to fail or return unexpected formats on the first invocation, forcing the agent to read the error and retry or adapt.

#### 3. Dynamic Planning & State Management
- **Metric:** *Plan Adherence vs. Adaptation* - Measuring if agents follow their initial step-by-step plan, and more importantly, if they correctly modify the plan when new information invalidates an early assumption.
- **Testing Approach:** Provide the agent with partial information that is later contradicted by a tool call, requiring a pivot in strategy.

### Proposed Benchmark Backlog for Summit Bench
1. **Multi-Agent Track (`GOLDEN/datasets/multi-agent`):** Develop a deterministic evaluation track where two discrete agent roles must coordinate to summarize and combine separate datasets into a final unified response.
2. **Tool Use Robustness Track (`GOLDEN/datasets/tooluse`):** Develop a track focused heavily on parallel tool calling, asynchronous execution failures, and forced fallback strategies.
3. **Long-Horizon Planning:** (Future) Evaluate state persistence over 10+ turns, ensuring critical constraints are not forgotten.

### Next Steps
- Implement the `multi-agent` and `tooluse` case definitions and deterministic fixtures in the `GOLDEN/datasets` directory.
- Update the scoring engine to parse the new metrics (e.g., tracking tool errors encountered vs. final task success).
