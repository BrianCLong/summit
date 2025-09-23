### Context
Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`
Excerpt/why: A kill switch is a non-negotiable safety feature for any autonomous system. It provides a reliable, immediate way to halt all operations. Autonomy profiles allow for graduated control, ensuring that the system only operates within approved bounds.

### Problem / Goal
The orchestrator lacks a centralized, immediate mechanism to halt all in-progress and pending work. It also lacks a concept of autonomy levels, making it difficult to control the blast radius of automated actions. The goal is to implement a global kill switch and configurable autonomy profiles.

### Proposed Approach
- Implement a global kill switch using a fast, centralized configuration store (like Redis or etcd).
- The orchestrator's main control loop and task execution engine will check the kill switch status before processing any new work.
- If the kill switch is active, all new tasks are rejected, and a signal is sent to gracefully terminate in-flight tasks.
- Define autonomy profiles (e.g., A0-Manual, A1-Assisted, A2-Semi-Autonomous) in a configuration file.
- Each task/worker will be associated with an autonomy level, and the orchestrator will only execute tasks that are at or below the currently configured system-wide autonomy level.

### Tasks
- [ ] Design the schema for the kill switch and autonomy profile configuration.
- [ ] Implement the kill switch check in the core scheduling loop.
- [ ] Implement the logic to gracefully terminate in-flight tasks when the kill switch is engaged.
- [ ] Implement the autonomy profile configuration loader.
- [ ] Add an autonomy level check before dispatching tasks to workers.
- [ ] Create a CLI or API endpoint to activate/deactivate the kill switch and change the autonomy level.
- [ ] Add E2E tests for the kill switch and for autonomy level changes.

### Acceptance Criteria
- Given the kill switch is activated, when a new task is submitted, then it is rejected immediately.
- Given the kill switch is activated, then all in-flight tasks are terminated within 30 seconds.
- Given the system autonomy level is set to `A1`, when a task requiring `A2` is dispatched, then it is rejected.
- Metrics/SLO: Kill switch activation propagation time < 5s.
- Tests: E2E tests for kill switch activation/deactivation and for changing autonomy profiles.
- Observability: A metric indicating the kill switch status; logs for all kill switch and autonomy level changes.

### Safety & Policy
- Action class: DEPLOY (as it controls the entire system)
- OPA rule(s) evaluated: Access to the kill switch and autonomy level controls must be strictly restricted.

### Dependencies
- Depends on: #<id_of_durable_store_issue>
- Blocks: All autonomous operations.

### DOR / DOD
- DOR: Design for kill switch mechanism and profiles approved.
- DOD: Merged, E2E tests passing, runbook includes detailed instructions for emergency stop procedures.

### Links
- Code: `<path/to/orchestrator/safety>`
- Docs: `<link/to/safety/runbook>`
