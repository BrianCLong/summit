import json
from pathlib import Path

SCHEMA_FILES = [
    "evidence/schemas/inhouse-data-agent-report.schema.json",
    "evidence/schemas/inhouse-data-agent-metrics.schema.json",
    "evidence/schemas/inhouse-data-agent-stamp.schema.json",
]


def test_inhouse_data_agent_schemas_load() -> None:
    for rel_path in SCHEMA_FILES:
        payload = json.loads(Path(rel_path).read_text(encoding="utf-8"))
        assert isinstance(payload, dict)
        assert payload.get("title")
