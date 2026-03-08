import numpy as np


class ShapIQEstimator:
    def __init__(self, model, max_order=2, seed=42):
        self.model = model
        self.max_order = max_order
        self.seed = seed
        self.rng = np.random.default_rng(self.seed)

    def explain(self, instance, num_samples=1000):
        # A simple deterministic dummy implementation for demonstration
        # Real implementation would compute Shapley values
        num_features = len(instance)
        attributions = {f"feature_{i}": self.rng.random() for i in range(num_features)}
        return attributions
