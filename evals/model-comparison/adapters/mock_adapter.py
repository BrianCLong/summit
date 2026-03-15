import json
from pathlib import Path
from typing import Dict, Any

from .base import ModelAdapter

class MockAdapter(ModelAdapter):
    """
    Mock adapter that reads static responses from a fixtures file.
    This ensures no live API calls are made during CI.
    """

    def __init__(self, model_name: str, responses_path: str = None):
        super().__init__(model_name)

        if responses_path is None:
            # Default to the responses.json fixture relative to this file
            responses_path = Path(__file__).resolve().parents[1] / "fixtures" / "responses.json"

        self.responses_path = responses_path
        self._load_responses()

    def _load_responses(self):
        with open(self.responses_path, "r", encoding="utf-8") as f:
            self.responses = json.load(f)

    def generate(self, prompt: str, task_type: str) -> Dict[str, Any]:
        """
        Lookup the mock response for the given task type and model.
        In a real adapter, this would use the prompt to make an API call.
        For our static mock, we just use the task_type and prompt as a key.
        """
        model_responses = self.responses.get(self.model_name, {})

        # Simple lookup: match by task type and check if prompt is in the mock prompts
        # For our simple harness, we assume one mock per task type per model
        task_response = model_responses.get(task_type)

        if not task_response:
            # Fallback if no specific response is mocked
            return {
                "response": f"Mock error: No response configured for model '{self.model_name}' and task '{task_type}'",
                "latency_ms": 100,
                "cost": 0.0001
            }

        return {
            "response": task_response.get("response", ""),
            "latency_ms": task_response.get("latency_ms", 250),
            "cost": task_response.get("cost", 0.001)
        }
