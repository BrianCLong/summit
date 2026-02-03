import os
from typing import Any

from summit.moral.propagate import propagate_priors

MORAL_LAYER_ENABLED = os.environ.get("MORAL_LAYER_ENABLED", "false").lower() == "true"

def on_graph_update(graph: Any) -> None:
    """
    Hook called when the influence graph is updated.
    """
    if MORAL_LAYER_ENABLED:
        # In a real implementation, we would fetch priors here
        propagate_priors(graph, {})
