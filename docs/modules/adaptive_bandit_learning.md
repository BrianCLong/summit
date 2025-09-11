### Context

Source: `docs/CONDUCTOR_PRD_v1.0.md`, `docs/ChatOps/autonomous_build_operator_full_roadmap_tuning_guide.md`, `server/src/conductor/learn/bandit.ts`
Excerpt/why: The router needs to move beyond static rules to intelligently optimize expert choice based on real-time feedback (cost, quality, latency). Adaptive bandit algorithms like LinUCB and Thompson Sampling are identified as key to improving success rates and efficiency.

### Problem / Goal

The current router, while supporting basic rules and fallbacks, lacks the ability to learn and adapt its routing decisions over time. This leads to suboptimal performance, higher costs, and missed opportunities for improvement. The goal is to implement adaptive bandit learning algorithms (e.g., LinUCB, Thompson Sampling) to dynamically optimize expert selection based on observed rewards.

### Proposed Approach

- Integrate contextual bandit algorithms (e.g., LinUCB) and multi-armed bandit algorithms (e.g., Thompson Sampling) into the router.
- Define a reward mechanism for routing decisions (e.g., task success, cost, latency, quality metrics).
- Implement a feedback loop where the bandit algorithms update their priors based on these rewards.
- Support A/B testing of different bandit strategies or arms.
- Ensure persistence of bandit states for continuous learning and recovery.
- Provide telemetry for bandit performance (e.g., win-rate, exploration vs. exploitation).

### Tasks

- [ ] Research and select the specific bandit algorithms to implement (e.g., LinUCB, Thompson Sampling).
- [ ] Define the reward signals and how they will be collected.
- [ ] Implement the bandit learning logic within the router component.
- [ ] Integrate the feedback loop for updating bandit priors.
- [ ] Implement persistence for bandit states (e.g., in Redis or PostgreSQL).
- [ ] Add metrics and dashboards for monitoring bandit performance.
- [ ] Develop A/B testing capabilities for bandit strategies.

### Acceptance Criteria

- Given a set of routing decisions, the bandit algorithm learns to select experts that optimize for the defined reward (e.g., higher success rate, lower cost).
- Contextual bandit improves success-rate ≥10% over baseline on A/B traffic without cost regression.
- Bandit states are durably persisted and can be restored.
- Metrics/SLO: Win-rate ≥ baseline +10 p.p.; p95 routing decision latency < 250 ms.
- Tests: Simulation tests for bandit learning, A/B testing validation.
- Observability: Dashboards showing bandit arm performance, exploration/exploitation trade-offs, and reward distribution.

### Safety & Policy

- Action class: READ (routing decisions)
- OPA rule(s) evaluated: N/A

### Dependencies

- Depends on: #<id_of_router_issue>, #<id_of_observability_issue>
- Blocks: Advanced routing optimization.

### DOR / DOD

- DOR: Bandit algorithm selection and reward mechanism design approved.
- DOD: Merged, bandit learning is active in production, performance metrics are visible.

### Links

- Code: `<path/to/router/bandit_learning>`
- Docs: `<link/to/bandit/design_doc>`
