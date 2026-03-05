import json
import subprocess
import sys
from fnmatch import fnmatch
from pathlib import Path
from typing import Iterable, List, Set


def _load_allowlist(path: Path) -> dict:
    return json.loads(path.read_text())


def _git_diff_names(base_ref: str, head_ref: str) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", f"{base_ref}...{head_ref}"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.stderr.strip() or "git diff failed") from exc
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def _filter_ignored(paths: Iterable[str], ignore_patterns: Iterable[str]) -> list[str]:
    ignore = list(ignore_patterns)
    filtered: list[str] = []
    for path in paths:
        if any(fnmatch(path, pattern) for pattern in ignore):
            continue
        filtered.append(path)
    return filtered


def _matches_any(path: str, candidates: Iterable[str]) -> bool:
    return any(path == candidate for candidate in candidates)


def main() -> int:
    allowlist_path = Path("ci/deps_delta_allowlist.json")
    allowlist = _load_allowlist(allowlist_path)

    base_ref = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
    head_ref = sys.argv[2] if len(sys.argv) > 2 else "HEAD"

    changed = _git_diff_names(base_ref, head_ref)
    changed = _filter_ignored(changed, allowlist.get("ignore_paths", []))
    if not changed:
        print("deps-delta: no changes detected")
        return 0

    dependency_files: set[str] = set(allowlist.get("dependency_files", []))
    deps_delta_files: set[str] = set(allowlist.get("deps_delta_files", []))

    touched_dependency_files = [
        path for path in changed if _matches_any(path, dependency_files)
    ]
    if not touched_dependency_files:
        print("deps-delta: no dependency files changed")
        return 0

    touched_delta_files = [
        path for path in changed if _matches_any(path, deps_delta_files)
    ]
    if touched_delta_files:
        print("deps-delta: dependency changes documented")
        return 0

    joined = ", ".join(touched_dependency_files)
    print(
        "deps-delta: dependency changes require deps_delta.md update; "
        f"changed dependency files: {joined}"
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
