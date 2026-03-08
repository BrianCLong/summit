import numpy as np


class AttentionInspector:
    """
    Collects attention map metrics for evidence storage.
    """

    def __init__(self, output_dir="evidence/attention_maps"):
        self.output_dir = output_dir

    def collect_attention(self, tokens, mask_shape):
        """
        Creates a dummy attention map from tokens and mask shape.
        """
        # Return a uniform map mimicking focused attention inside a mask
        return np.ones(mask_shape)
