from __future__ import annotations
import json
from pathlib import Path
import jsonschema

SCHEMA_PATH = Path(__file__).parent / "spp_schema.json"

def validate_spp(manifest_path: str | Path) -> list[str]:
    """
    Returns a list of human-readable errors. Empty list == valid.
    """
    p = Path(manifest_path)
    if not p.exists():
        return [f"manifest not found: {manifest_path}"]

    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"invalid json: {e}"]

    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = json.load(f)
        jsonschema.validate(instance=data, schema=schema)
    except jsonschema.ValidationError as e:
        return [f"schema validation error: {e.message} at {list(e.path)}"]
    except Exception as e:
        return [f"unexpected error during validation: {e}"]

    return []
