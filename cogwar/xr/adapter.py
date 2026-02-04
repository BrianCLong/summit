from __future__ import annotations

from typing import Protocol


class XRAdapter(Protocol):
    def normalize_event(self, raw_event: dict) -> dict:
        """Normalize XR telemetry to schemas/cogwar/xr_event.schema.json."""
        raise NotImplementedError
