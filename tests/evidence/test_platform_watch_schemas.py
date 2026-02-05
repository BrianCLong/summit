import json
from pathlib import Path

SCHEMA_FILES = [
    "evidence/schemas/platform-watch-report.schema.json",
    "evidence/schemas/platform-watch-metrics.schema.json",
    "evidence/schemas/platform-watch-stamp.schema.json",
    "evidence/schemas/platform-watch-index.schema.json",
]


def test_platform_watch_schemas_load() -> None:
    for rel_path in SCHEMA_FILES:
        payload = json.loads(Path(rel_path).read_text(encoding="utf-8"))
        assert isinstance(payload, dict)
        assert payload.get("title")
