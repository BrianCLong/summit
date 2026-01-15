#!/usr/bin/env python3
"""Generate a structured TODO inventory from the repository.

The script scans text files for TODO/FIXME/TBD markers and emits a JSON payload
summarizing location, context, and a suggested issue title stub. Use the output
as input to Linear/board importers to keep parity with repository work items.
"""

import argparse
import json
from collections.abc import Iterable, Sequence
from pathlib import Path

DEFAULT_MARKERS: Sequence[str] = ("TODO", "FIXME", "TBD")
SKIP_DIRS: Sequence[str] = (
    ".git",
    "node_modules",
    "dist",
    "build",
    "tmp",
    "__pycache__",
    ".cache",
)


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    return any(skip in parts for skip in SKIP_DIRS)


def is_text_file(path: Path, max_bytes: int = 2_000_000) -> bool:
    try:
        if path.is_dir() or path.stat().st_size > max_bytes:
            return False
        with path.open("rb") as fh:
            sample = fh.read(1024)
        return b"\0" not in sample
    except (OSError, PermissionError):
        return False


def scan_file(path: Path, markers: Sequence[str]) -> list[dict]:
    results: list[dict] = []
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            for idx, line in enumerate(fh, start=1):
                if any(marker in line for marker in markers):
                    results.append(
                        {
                            "path": str(path),
                            "line": idx,
                            "text": line.strip(),
                            "suggested_title": build_title_stub(path, line),
                        }
                    )
    except (OSError, UnicodeError):
        return results
    return results


def build_title_stub(path: Path, line: str) -> str:
    base = path.name
    content = line.strip().split("#", 1)[-1].strip() if "#" in line else line.strip()
    return f"Resolve TODO in {base}: {content[:80]}" if content else f"Resolve TODO in {base}"


def walk_paths(root: Path, markers: Sequence[str]) -> Iterable[dict]:
    for path in root.rglob("*"):
        if should_skip(path):
            continue
        if not is_text_file(path):
            continue
        yield from scan_file(path, markers)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a TODO inventory JSON artifact.")
    parser.add_argument("--root", type=Path, default=Path("."), help="Root directory to scan")
    parser.add_argument(
        "--markers", nargs="*", default=list(DEFAULT_MARKERS), help="Markers to search for"
    )
    parser.add_argument(
        "--output", type=Path, default=None, help="Optional output file path for JSON"
    )
    args = parser.parse_args()

    root = args.root.resolve()
    inventory = list(walk_paths(root, args.markers))
    payload = {"root": str(root), "count": len(inventory), "items": inventory}

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
        print(f"Wrote {payload['count']} entries to {args.output}")
    else:
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
