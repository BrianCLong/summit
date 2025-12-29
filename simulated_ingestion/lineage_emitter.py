import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping


class LineageEmitter:
    """Lightweight JSONL emitter that enforces the lineage_event_v1 schema shape."""

    def __init__(self, sink_path: str | Path, operator: str, dataset: str):
        self.sink_path = Path(sink_path)
        self.operator = operator
        self.dataset = dataset
        self.sink_path.parent.mkdir(parents=True, exist_ok=True)

    def emit(
        self,
        *,
        output_id: str,
        output_type: str,
        input_ids: Iterable[str],
        transform_name: str,
        code_reference: str | None = None,
    ) -> Mapping[str, Any]:
        occurred_at = datetime.now(timezone.utc).isoformat()
        event = {
            "event_id": str(uuid.uuid4()),
            "operator": self.operator,
            "occurred_at": occurred_at,
            "dataset": self.dataset,
            "output": {"id": output_id, "type": output_type},
            "inputs": [{"id": input_id, "dataset": self.dataset} for input_id in input_ids],
            "transform": {
                "name": transform_name,
                "code_reference": code_reference or "simulated_ingestion/ingestion_pipeline.py",
            },
        }
        self._validate_shape(event)
        with self.sink_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event) + "\n")
        return event

    def _validate_shape(self, event: Mapping[str, Any]) -> None:
        required_top = {"event_id", "operator", "occurred_at", "dataset", "output", "inputs", "transform"}
        missing_top = required_top.difference(event)
        if missing_top:
            raise ValueError(f"Lineage event missing required keys: {sorted(missing_top)}")

        output = event.get("output", {})
        if not isinstance(output, Mapping) or {"id", "type"}.difference(output):
            raise ValueError("Output must include id and type")

        inputs = event.get("inputs")
        if not isinstance(inputs, Iterable):
            raise ValueError("inputs must be iterable")
        for input_item in inputs:
            if not isinstance(input_item, Mapping) or "id" not in input_item:
                raise ValueError("Each input must include an id")

        transform = event.get("transform", {})
        if not isinstance(transform, Mapping) or "name" not in transform:
            raise ValueError("Transform must include a name")

