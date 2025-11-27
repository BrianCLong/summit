# experiment.py
# This is where you define your custom experiment logic.

from typing import Dict, Any
import time

def train_fn(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    User-defined function to run a single experiment.

    This function will be called by the ExperimentRunner in an isolated subprocess.
    It should take a dictionary `config` (proposed by the planner) and
    return a dictionary containing at least a "metrics" key.

    Args:
        config: A dictionary of parameters for this specific run.

    Returns:
        A dictionary with the results, e.g., {"metrics": {"accuracy": 0.9, "loss": 0.12}}.
        This can also include paths to saved artifacts like models or plots.
    """
    print(f"--- Running Experiment ---")
    print(f"  Config: {config}")

    # Simulate a training process
    time.sleep(2)

    # In a real scenario, you would:
    # 1. Load a dataset.
    # 2. Preprocess the data.
    # 3. Initialize a model based on the `config`.
    # 4. Train the model.
    # 5. Evaluate the model and calculate metrics.

    # For this template, we'll just return some mock metrics.
    # The value of these metrics can depend on the config to simulate
    # different experiment outcomes.
    accuracy = 0.80 + (config.get("param", 0.1) * 0.1)

    print(f"  Finished with accuracy: {accuracy:.4f}")

    return {
        "metrics": {
            "accuracy": accuracy,
            "loss": 1.0 - accuracy,
        }
    }
