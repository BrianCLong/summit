import hashlib
import json
from datetime import UTC, datetime, timezone
from typing import Any, Dict, Optional

from ..extractors.frame_elements import FrameElementExtractor


class NarrativeSkeletonExtractor:
    def __init__(self):
        self.frame_extractor = FrameElementExtractor()

    def process(self, doc_id: str, text: str, lang: str, tenant_id: str, timestamp: Optional[str] = None) -> dict[str, Any]:
        frame = self.frame_extractor.extract(text)

        # Use provided timestamp or current UTC time
        if timestamp is None:
            ts = datetime.now(UTC).isoformat()
            if not ts.endswith("Z") and "+00:00" in ts:
                 ts = ts.replace("+00:00", "Z")
        else:
            ts = timestamp

        skeleton = {
            "doc_id": doc_id,
            "tenant_id": tenant_id,
            "lang": lang,
            "timestamp": ts,
            "setting": {"time_refs": [], "place_refs": [], "domain": "example.com"},
            "characters": [],
            "frame": frame,
            "causal_chain": [],
            "claims": {},
            "credibility_stack": {},
            "propagation": {},
            "signals": {
                "structure_fingerprint": "",
                "risk_scores": {}
            }
        }

        # Calculate structure fingerprint (deterministic hash of structure)
        # Exclude timestamp and variable fields
        structure_payload = {
            "frame": frame,
            "lang": lang
        }
        skeleton["signals"]["structure_fingerprint"] = hashlib.sha256(
            json.dumps(structure_payload, sort_keys=True).encode()
        ).hexdigest()

        return skeleton
