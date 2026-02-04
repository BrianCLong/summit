import json
from typing import Any, Dict

from summit.orchestration.policy.trace_redaction import TraceRedactor


class MessyLogsIngestor:
    """Ingests and redacts conversational artifacts."""

    def __init__(self, redactor: TraceRedactor = None):
        self.redactor = redactor or TraceRedactor()

    def ingest(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Redacts and classifies raw transcript data."""
        # 1. Redact transcript
        redacted_transcript = []
        for entry in raw_data.get("transcript", []):
            redacted_transcript.append({
                "speaker": entry["speaker"],
                "text": self.redactor.redact_text(entry["text"]),
                "metadata": entry.get("metadata", {})
            })

        # 2. Assign default classification if missing
        classification = raw_data.get("classification", "internal")

        return {
            "source": raw_data["source"],
            "timestamp": raw_data["timestamp"],
            "participants": raw_data.get("participants", []),
            "transcript": redacted_transcript,
            "classification": classification,
            "status": "redacted"
        }
