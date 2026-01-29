import hashlib
from typing import Any
from .policies import check_training_allowed, PolicyViolation

class TrainerStub:
    def __init__(self, base_model_path: str):
        self.base_model_path = base_model_path
        self.initial_hash = self._hash_model(base_model_path)

    def _hash_model(self, path: str) -> str:
        # Stub: just hash the path string for simulation
        return hashlib.sha256(path.encode()).hexdigest()

    def train_step(self, attempts: Any):
        check_training_allowed()
        # Simulate training
        # Ensure base model is not touched
        current_hash = self._hash_model(self.base_model_path)
        if current_hash != self.initial_hash:
            raise PolicyViolation("Base model modified during training step!")

        return "new_adapter_weights_stub"
