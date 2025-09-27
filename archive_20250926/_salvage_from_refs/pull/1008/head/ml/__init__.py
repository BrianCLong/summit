from pathlib import Path

SCHEMA_VERSION_FILE = Path(__file__).resolve().parents[1] / "schema/active_version.txt"


def require_schema_version(model_metadata: dict) -> None:
    """Ensure models declare a schema version compatible with the platform."""
    required = SCHEMA_VERSION_FILE.read_text().strip()
    version = model_metadata.get("schema_version")
    if version != required:
        raise RuntimeError(f"Model schema_version {version} is not compatible with required {required}")
