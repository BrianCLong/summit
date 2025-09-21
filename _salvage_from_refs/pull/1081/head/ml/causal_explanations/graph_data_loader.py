"""Load graph data for explanation routines."""

from types import SimpleNamespace
from typing import Any


def load_graph_data() -> Any:
    """Return a minimal structure mimicking a PyG data object."""
    return SimpleNamespace(x=None, edge_index=None)
