# IG-RL Service

The IG-RL service provides policy-aware reinforcement learning capabilities for IntelGraph. It brings
contextual bandits for UI/ETL assistance, model-based RL for course-of-action planning, safe RL for
queue management, and agentic runbooks under a single, governable control plane.

## Highlights

- **RewardHub** maps IntelGraph KPIs (time-to-insight, accuracy, cost guards) into scalar rewards with
  explicit provenance for each decision.
- **Policy-aware environments** ensure all actions are pre-filtered by OPA/ABAC constraints.
- **Explainability hooks** produce structured rationale and counterfactual summaries for the Graph-XAI
  surface as part of every `/advice` call.
- **Training manager** coordinates contextual bandits and PPO learners, with Kafka-friendly producer
  stubs ready for streaming deployments.
- **FastAPI gateway** exposes `/advice`, `/train`, `/register_reward`, and `/explain` endpoints,
  aligning with IntelGraph’s microservice conventions.

## Layout

```
services/ig-rl/
├── ig_rl/
│   ├── agents/             # PPO and LinUCB implementations
│   ├── clients/            # GraphQL, policy, and simulator clients
│   ├── envs/               # Graph COA, UX bandit, and queue tuner environments
│   ├── reward/             # RewardHub for KPI weighting
│   ├── kafka/              # Event publisher/consumer stubs
│   ├── provenance/         # Prov-Ledger logger façade
│   ├── service/            # FastAPI app wiring
│   ├── training/           # TrainingManager orchestration
│   └── xai/                # Explainability helpers
└── tests/                  # Pytest coverage for reward, env, and service endpoints
```

## Running locally

1. Create a virtual environment with Python 3.12.
2. Install dependencies:

   ```bash
   pip install fastapi uvicorn httpx numpy torch
   ```

3. Launch the API:

   ```bash
   uvicorn ig_rl.service.app:create_app --factory
   ```

   The factory expects configured policy and provenance clients; refer to the tests for lightweight
   stubs.

## Testing

```
pytest services/ig-rl/tests
```

The tests rely only on standard Python modules plus `numpy`, `torch`, and `fastapi` which are already
part of the developer toolchain.
