from dataclasses import dataclass


@dataclass(frozen=True)
class DiscrepancyFeatures:
    semantic_discrepancy: float
    sentiment_discrepancy: float
    visual_text_fidelity: float

class GDCFeatureExtractor:
    """
    GDCNet-inspired feature bank:
    - semantic discrepancy between anchor caption and text
    - sentiment discrepancy between anchor caption and text
    - visual-text fidelity (alignment proxy)
    """
    def __init__(self) -> None:
        pass

    def extract(self, *, anchor_caption: str, text: str, image_feat=None, text_feat=None) -> DiscrepancyFeatures:
        # TODO(Lane1): wire to Summit’s existing embedders/sentiment tools if present.
        # Deterministic safe defaults:
        return DiscrepancyFeatures(
            semantic_discrepancy=0.0,
            sentiment_discrepancy=0.0,
            visual_text_fidelity=0.0,
        )
