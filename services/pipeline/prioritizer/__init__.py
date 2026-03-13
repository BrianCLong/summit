from services.pipeline.config_flags import is_gnn_prioritizer_enabled
from services.pipeline.prioritizer.base import Prioritizer
from services.pipeline.prioritizer.gnn_stub import GNNPrioritizerStub
import logging

logger = logging.getLogger(__name__)

def get_prioritizer() -> Prioritizer:
    if is_gnn_prioritizer_enabled():
        logger.info("event:feature_flag.evaluated flag=FEATURE_PRIORITIZER_GNN result=True reason=env_var_enabled")
        return GNNPrioritizerStub()

    # Baseline fallback (could be a simple heuristics class, using stub for now if no baseline defined)
    logger.info("event:feature_flag.evaluated flag=FEATURE_PRIORITIZER_GNN result=False reason=env_var_disabled_fallback")
    return GNNPrioritizerStub() # Using stub as baseline for this exercise
