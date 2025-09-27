# PRER Python SDK

```python
from prer_client import PrerClient

client = PrerClient(base_url="http://localhost:3000", default_actor="analyst@company")

experiment = client.create_experiment(
    {
        "name": "Hero CTA",
        "hypothesis": "New CTA boosts clicks",
        "metrics": [
            {"name": "click_through", "baselineRate": 0.12, "minDetectableEffect": 0.015}
        ],
        "stopRule": {"maxDurationDays": 14, "maxUnits": 10000},
        "analysisPlan": {
            "method": "difference-in-proportions",
            "alpha": 0.05,
            "desiredPower": 0.8,
        },
    }
)

client.start_experiment(experiment["id"])
```
