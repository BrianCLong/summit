import os
from pathlib import Path

def safe_path_join(base_dir: Path, untrusted_path: str) -> Path:
    """
    Safely joins a base directory with an untrusted path, preventing directory traversal.
    Raises ValueError if the untrusted_path attempts to access outside base_dir.
    """
    if not untrusted_path:
        raise ValueError("Untrusted path cannot be empty.")

    # Reject absolute paths
    if os.path.isabs(untrusted_path):
        raise ValueError("Absolute paths are not allowed.")

    # Reject paths containing null bytes
    if '\0' in untrusted_path:
        raise ValueError("Null bytes are not allowed in path.")

    # Resolve the path to prevent '..' traversal
    resolved_path = (base_dir / untrusted_path).resolve()

    # Ensure the resolved path is still within the base directory
    if not resolved_path.is_relative_to(base_dir):
        raise ValueError("Directory traversal detected.")

    return resolved_path
