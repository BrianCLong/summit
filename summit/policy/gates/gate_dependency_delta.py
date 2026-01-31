# summit/policy/gates/gate_dependency_delta.py
import os

def verify_delta_updated(changed_files: list[str]) -> list[str]:
    """
    Enforce that DEPENDENCY_DELTA.md is updated if dependencies are modified.
    """
    dependency_files = {
        "package.json",
        "pnpm-lock.yaml",
        "requirements.txt",
        "requirements.in",
        "pyproject.toml",
        "poetry.lock",
        "Cargo.toml",
        "Cargo.lock",
    }

    has_dep_changes = any(f in changed_files for f in dependency_files)
    delta_updated = "DEPENDENCY_DELTA.md" in changed_files

    if has_dep_changes and not delta_updated:
        return ["missing_dependency_delta_update"]
    return []
