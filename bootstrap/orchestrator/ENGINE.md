# Summit Orchestrator Engine

The orchestrator:

1. Loads `summit.yaml`
2. Instantiates agent descriptors
3. Builds an in-memory flow graph
4. Applies governance rules
5. Runs tasks via the Executor agent
6. Produces logs, metrics, and state snapshots

The orchestrator is NOT an agent — it is the substrate the agents run on.

## Responsibilities

- Resolve agent paths + runtime-specs
- Wire flows together
- Perform governance validation at runtime load
- Track state (per-agent, per-flow, per-task)
- Emit events for:
  - flow start / end
  - agent handoff
  - errors
  - PR readiness
- Persist logs
- Maintain a replayable record of end-to-end flows
