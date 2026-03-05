import numpy as np


class InteractionManager:
    def __init__(self, max_order=2, seed=42):
        self.max_order = max_order
        self.rng = np.random.default_rng(seed)

    def compute_interactions(self, instance):
        num_features = len(instance)
        # Create symmetric interaction matrix
        matrix = self.rng.random((num_features, num_features))
        matrix = (matrix + matrix.T) / 2
        np.fill_diagonal(matrix, 0)
        return matrix
