from typing import Any, Optional, Sequence
import statistics
from .config import GeometryMonitorConfig
from .events import GeometryComplexityEvent
from .vgt import compute_local_dimensions

class GeometryMonitor:
    def __init__(self, cfg: GeometryMonitorConfig):
        self._cfg = cfg

    def observe(self, activations: Sequence[Sequence[float]], meta: dict) -> Optional[GeometryComplexityEvent]:
        # Deny-by-default
        if not self._cfg.enabled:
            return None

        # Safe handling of activations
        if not activations:
            return None

        # Sampling/Truncation
        current_points = list(activations) # Copy to be safe
        if len(current_points) > self._cfg.max_points:
             # Simple truncation
             current_points = current_points[:self._cfg.max_points]

        # Compute VGT stats
        dims = compute_local_dimensions(current_points)
        if not dims:
            return None

        # Metric aggregation (never log raw points)
        # Ensure standard floats for JSON serialization safety
        avg_dim = float(statistics.mean(dims))
        median_dim = float(statistics.median(dims))

        return GeometryComplexityEvent(
            episode_id=meta.get("episode_id", "unknown"),
            step=meta.get("step", 0),
            complexity_score=avg_dim,
            vgt_curve=[float(x) for x in sorted(dims)], # Profile of dimensions
            local_dim_mode=median_dim
        )
