# Leakage Red-Team Tournament (LRT)

The **Leakage Red-Team Tournament** simulates adversarial agents attempting to exfiltrate
seeded canaries from a protected API surface. It provides deterministic scoring
metrics, pluggable defense adapters, and a JSON-schema-backed leaderboard for
tracking progress over time.

## Features

- Deterministic seeded canary generation for reproducible runs.
- Baseline attack agents: prompt crafting, query chaining, and a timing side-channel stub.
- Harness that reports precision, recall, and time-to-first-leak across agents.
- Defense adapters compatible with RSR/PPC/CCC strategies for A/B testing.
- Leaderboard helpers plus a `leaderboard.schema.json` for downstream integrations.

## Usage

```python
from pathlib import Path

from lrt import LRTHarness, LRTConfig, ProtectedAPI, generate_canaries
from lrt.agents import prompt_craft, query_chain, timing
from lrt.defenses import RSRDefense, PPCDefense, CCCDefense
from lrt.leaderboard import Leaderboard

catalog = generate_canaries(seed=2024, count=4)
api = ProtectedAPI(
    knowledge_base=catalog.canaries + ["safe-response"],
    canaries=catalog.canaries,
    defenses=[RSRDefense(), PPCDefense(), CCCDefense()],
)

agents = [
    prompt_craft.PromptCraftAgent(seed=1),
    query_chain.QueryChainingAgent(seed=2),
    timing.TimingSideChannelAgent(seed=3),
]

harness = LRTHarness(api=api, canaries=catalog, config=LRTConfig(seed=42, agents=agents))
result = harness.run()

board = Leaderboard(Path("runs/leaderboard.json"))
entry = board.from_harness(
    run_id="demo",
    seed=42,
    harness_result=result,
    agents=agents,
    defenses=[defense.name for defense in api.defenses],
)
board.append(entry)
board.save()
```

## Testing

Unit tests live in `tools/lrt/tests`. Execute them with:

```bash
python -m unittest discover tools/lrt/tests
```
