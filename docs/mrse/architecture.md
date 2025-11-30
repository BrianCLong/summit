# Meta-Reality Simulation Engine (MRSE) Architecture

MRSE augments Summit's MCO (truth substrate) and MIFE (intent substrate) with a
predictive simulation substrate that projects future repository trajectories
before agents execute real changes. The engine constructs a branching *reality
graph* of possible worlds, evaluates each trajectory, and recommends optimal
paths for orchestrators.

## Core Concepts

- **World State**: A snapshot of repository structure, pending diffs, active
  intents, constraints, risks, and runtime signals (CI, cost, safety).
- **State Mutation Engine**: Expands a world into candidate futures by applying
  predicted agent actions and architectural events.
- **Agent Behavior Models**: Deterministic or probabilistic policies describing
  how Summit agents (e.g., Jules, Codex) request context, generate code, and
  propose tasks.
- **Constraint Engine**: Enforces invariants, safety posture, intent alignment,
  and governance rules inside simulations to discard unsafe futures early.
- **Reality Graph**: A directed graph linking world states across horizons with
  edge provenance that describes the mutation that produced each child state.
- **Path Evaluator**: Scores full trajectories on alignment, safety, stability,
  velocity, and risk to select best/safe/fast/aligned futures.
- **Horizon Manager**: Controls simulation depth and breadth, enabling short-
  and long-horizon exploration.

## Module Layout

- `world_state.py`: dataclass and builder for normalized world snapshots.
- `agent_models.py`: pluggable behavior policies with typed actions.
- `state_mutation.py`: orchestrates action application and constraint checks.
- `constraint_engine.py`: invariant validation and safety enforcement hooks.
- `reality_graph.py`: adjacency storage plus traversal helpers.
- `path_evaluator.py`: trajectory scoring utilities.
- `horizon_manager.py`: multi-step graph expansion driver.
- `scenario_generator.py`: curated scenarios for targeted simulation runs.

## Data Flow

1. **Seed**: Build a `WorldState` from current MCO/MIFE/repo adapters.
2. **Expand**: `StateMutationEngine` queries each `BaseAgentModel` for predicted
   actions and applies them into cloned child states.
3. **Validate**: `ConstraintEngine` screens each child state against invariants
   and intents; invalid futures are pruned.
4. **Graph Assembly**: `RealityGraph` records states and edges for all horizons.
5. **Evaluation**: `PathEvaluator` walks candidate paths to compute composite
   scores and highlight optimal trajectories.

## Extensibility Hooks

- **Action providers**: Register additional `BaseAgentModel` subclasses to encode
  governance, observability, or security behaviors.
- **Constraint checks**: Supply custom predicate callables to evaluate
  compliance, policy, or architectural consistency.
- **Scoring functions**: Override `PathEvaluator` partials to inject
  cost/latency/maintainability metrics.
- **Scenario driver**: Combine `ScenarioGenerator` outputs with horizon depth to
  target specific what-if branches.

## Integration Notes

- MRSE is library-first: embed `HorizonManager` inside orchestrator workflows or
  expose it through API surfaces (REST/MCP) to trigger simulations on demand.
- Use adapters to hydrate `WorldState` from live systems; the default
  implementation relies on pure-Python callables to keep tests hermetic.
- Scoring functions are deterministic and side-effect free to ensure simulated
  results are reproducible for audits.

## Example Simulation

```python
state = WorldState.from_sources(repo_snapshot, intents, invariants, constraints)
engine = StateMutationEngine(agent_models, ConstraintEngine(custom_checks))
manager = HorizonManager(engine)

graph = manager.generate_trees(state, depth=3)
path = PathEvaluator().best_path(graph, root_id=state.id)
```

The resulting `path` contains ordered world IDs and aggregate scoring for review
by orchestrators before real changes are scheduled.
