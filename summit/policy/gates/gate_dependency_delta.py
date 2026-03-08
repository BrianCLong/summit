import os


def check_dependency_delta(changed_files):
    """
    CI gate: Reject if dependency files changed but dependency-delta.md was not updated.
    """
    dep_files = ["package.json", "pyproject.toml", "requirements.txt", "pnpm-lock.yaml", "Cargo.toml"]

    deps_changed = any(f in changed_files for f in dep_files)
    delta_updated = "dependency-delta.md" in changed_files

    if deps_changed and not delta_updated:
        return False, "Dependencies changed but dependency-delta.md was not updated."

    return True, "Dependency delta check passed."
