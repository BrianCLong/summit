import hashlib
import json
from typing import Any, Dict, List


class ContextCompactor:
    def compact(self, history: list[dict[str, Any]]) -> str:
        if not history:
            return ""
        canonical_history = json.dumps(history, sort_keys=True)
        h = hashlib.sha256(canonical_history.encode()).hexdigest()
        return f"Deterministic summary of {len(history)} events. Integrity: {h[:16]}"

    def get_citation_pointers(self, history: list[dict[str, Any]]) -> list[str]:
        citations = []
        for event in history:
            if "evidence_id" in event:
                citations.append(event["evidence_id"])
            if "citations" in event:
                citations.extend(event["citations"])
        return sorted(list(set(citations)))
