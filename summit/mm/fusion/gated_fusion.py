from dataclasses import dataclass


@dataclass(frozen=True)
class FusionOutput:
    fused: object
    gate: float

class GatedFusion:
    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    def fuse(self, vision_repr, text_repr, discrepancy_repr) -> FusionOutput:
        if not self.enabled:
            return FusionOutput(fused=(vision_repr, text_repr), gate=0.0)
        # TODO: replace with learned gate; Lane1 can start with a simple MLP if Summit has torch.
        return FusionOutput(fused=(vision_repr, text_repr, discrepancy_repr), gate=0.5)
