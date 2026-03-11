# Model Comparison Evaluation Harness

This directory contains the harness for comparing different LLM backends across Summit's key tasks:
- Entity Extraction
- Narrative Risk Scoring
- Query Response Generation

The harness evaluates multiple model configurations against a static set of fixtures to determine quality scores (accuracy, hallucination rate, consistency) as well as cost and latency.

## Architecture

- **`harness.py`**: The main entry point. It iterates over tasks and adapters, aggregates results, computes metrics, and outputs a `comparison_report.json`.
- **`metrics.py`**: Contains the logic for calculating accuracy, hallucination rates, and consistency based on expected vs. actual outputs for different task types.
- **`adapters/`**: Contains the `ModelAdapter` base class and concrete implementations. The harness uses a pluggable adapter pattern.
- **`fixtures/`**: Static JSON files containing the tasks and mock responses.

*Note: To adhere to CI boundaries, the harness uses `MockAdapter` to read from `fixtures/responses.json` rather than making live API calls during automated runs.*

## Running the Harness

To execute the harness locally and generate the comparison report:

```bash
python evals/model-comparison/harness.py
```

This will produce `evals/model-comparison/comparison_report.json`.

If you are running this as part of a formal evaluation run and wish to emit evidence artifacts:

```bash
python evals/model-comparison/harness.py --emit-evidence evidence/EVD-MODELCOMPARE-EVAL-001
```

## Adding a New Model Adapter

To plug in a real model for local testing or future expansion, subclass `ModelAdapter`:

```python
# evals/model-comparison/adapters/my_new_model.py
from typing import Dict, Any
from .base import ModelAdapter
import time

class MyNewModelAdapter(ModelAdapter):
    def __init__(self, api_key: str):
        super().__init__("my-new-model")
        self.api_key = api_key

    def generate(self, prompt: str, task_type: str) -> Dict[str, Any]:
        start = time.time()

        # 1. Make your API call here using self.api_key and prompt
        response_text = "..."

        # 2. Calculate latency
        latency_ms = int((time.time() - start) * 1000)

        # 3. Calculate cost based on token usage
        cost = 0.005

        return {
            "response": response_text,
            "latency_ms": latency_ms,
            "cost": cost
        }
```

Then, update `harness.py` to instantiate your new adapter in the `adapters` list.
