from abc import ABC, abstractmethod
from typing import Dict, Any

class ModelAdapter(ABC):
    """
    Abstract base class for model adapters in the model-comparison harness.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    @abstractmethod
    def generate(self, prompt: str, task_type: str) -> Dict[str, Any]:
        """
        Generate a response for a given prompt.

        Args:
            prompt: The input prompt to the model.
            task_type: The type of task (e.g., 'entity_extraction', 'narrative_risk_scoring', 'query_response').

        Returns:
            A dictionary containing:
            - 'response': The generated text or JSON structure.
            - 'latency_ms': The time taken to generate the response in milliseconds.
            - 'cost': The simulated cost of the request.
        """
        pass
