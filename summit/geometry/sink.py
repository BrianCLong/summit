import json
import logging
from .events import GeometryComplexityEvent

logger = logging.getLogger(__name__)

class GeometrySink:
    def log(self, event: GeometryComplexityEvent):
        # Ensure we only log the allowed fields
        payload = {
            "episode_id": event.episode_id,
            "step": event.step,
            "complexity_score": event.complexity_score,
            "local_dim_mode": event.local_dim_mode,
            "vgt_curve": list(event.vgt_curve)
        }
        # Serialize to ensure it's valid JSON and no hidden objects
        try:
            msg = json.dumps(payload)
            logger.info(f"GEOMETRY_EVENT {msg}")
        except TypeError as e:
            logger.error(f"Failed to serialize geometry event: {e}")
