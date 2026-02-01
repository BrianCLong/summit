from pathlib import Path
import json

SCHEMA_FILES = [
    "evidence/schemas/se-dicow-report.schema.json",
    "evidence/schemas/se-dicow-metrics.schema.json",
    "evidence/schemas/se-dicow-stamp.schema.json",
    "evidence/schemas/se-dicow-index.schema.json",
]


def test_se_dicow_schema_files_exist_and_validate():
    repo_root = Path(__file__).resolve().parents[3]
    jsonschema = None
    try:
        import jsonschema as jsonschema_module

        jsonschema = jsonschema_module
    except ImportError:
        jsonschema = None
    for rel_path in SCHEMA_FILES:
        schema_path = repo_root / rel_path
        assert schema_path.exists(), f"Missing schema: {rel_path}"
        schema_data = json.loads(schema_path.read_text(encoding="utf-8"))
        assert "$schema" in schema_data
        assert "type" in schema_data
        assert "properties" in schema_data
        if jsonschema is not None:
            jsonschema.Draft202012Validator.check_schema(schema_data)
