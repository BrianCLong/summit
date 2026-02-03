from services.pipeline.config_flags import is_gnn_prioritizer_enabled
from services.pipeline.prioritizer.base import Prioritizer
from services.pipeline.prioritizer.gnn_stub import GNNPrioritizerStub


def get_prioritizer() -> Prioritizer:
    if is_gnn_prioritizer_enabled():
        return GNNPrioritizerStub()
    # Baseline fallback (could be a simple heuristics class, using stub for now if no baseline defined)
    return GNNPrioritizerStub() # Using stub as baseline for this exercise
