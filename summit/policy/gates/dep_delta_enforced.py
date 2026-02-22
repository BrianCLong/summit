from typing import List, Tuple


def check(changed_files: list[str]) -> tuple[bool, list[str]]:
    errs: list[str] = []
    has_lockfile_change = any(f.endswith("lock.json") or f.endswith("lock.yaml") or f == "go.sum" or f.endswith("lock") for f in changed_files)
    has_delta_doc = "docs/dependency_delta.md" in changed_files or "dependency-delta.md" in changed_files

    if has_lockfile_change and not has_delta_doc:
        errs.append("Lockfile changed but dependency_delta.md not updated")

    return (len(errs) == 0, errs)
