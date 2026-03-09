import time
from typing import Any


def build_provenance_record(
    run_id: str, params: dict[str, Any], git_commit: str | None = None
) -> dict[str, Any]:
    """
    Build a JSON-serializable provenance record.
    """
    return {
        "run_id": run_id,
        "timestamp": time.time(),
        "params": params,
        "git_commit": git_commit,
        "schema_version": "1.0.0",
    }
