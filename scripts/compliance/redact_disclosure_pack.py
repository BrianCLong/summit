#!/usr/bin/env python3
"""Redact PII/secrets from disclosure pack artifacts."""

from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterable
from pathlib import Path
from re import Pattern

REDACTION_TOKEN = "[REDACTED]"


def load_regex_lines(path: Path) -> list[Pattern[str]]:
    patterns: list[Pattern[str]] = []
    if not path.exists():
        raise FileNotFoundError(f"Denylist not found: {path}")
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#"):
            continue
        patterns.append(re.compile(entry, re.IGNORECASE))
    return patterns


def load_secret_patterns(path: Path) -> list[Pattern[str]]:
    if not path.exists():
        raise FileNotFoundError(f"Secret patterns not found: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    patterns: list[Pattern[str]] = []
    for rule in payload:
        regex = rule.get("pattern")
        if not regex:
            continue
        patterns.append(re.compile(regex, re.IGNORECASE))
    return patterns


def is_binary(path: Path) -> bool:
    try:
        sample = path.read_bytes()[:2048]
    except OSError:
        return False
    return b"\x00" in sample


def redact_text(text: str, patterns: Iterable[Pattern[str]]) -> str:
    redacted = text
    for pattern in patterns:
        redacted = pattern.sub(REDACTION_TOKEN, redacted)
    return redacted


def find_matches(text: str, patterns: Iterable[Pattern[str]]) -> list[str]:
    matches: list[str] = []
    for pattern in patterns:
        if pattern.search(text):
            matches.append(pattern.pattern)
    return matches


def redact_pack(pack_dir: Path, denylist: Path, secret_patterns: Path) -> int:
    patterns = load_regex_lines(denylist) + load_secret_patterns(secret_patterns)
    failures: list[str] = []
    redacted_files: list[str] = []
    skipped_binary: list[str] = []

    for file_path in pack_dir.rglob("*"):
        if file_path.is_dir():
            continue
        if is_binary(file_path):
            skipped_binary.append(str(file_path))
            continue
        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        if not find_matches(content, patterns):
            continue
        updated = redact_text(content, patterns)
        if updated != content:
            file_path.write_text(updated, encoding="utf-8")
            redacted_files.append(str(file_path))
        remaining = find_matches(updated, patterns)
        if remaining:
            failures.append(f"{file_path}: {', '.join(remaining)}")

    if redacted_files:
        print("[INFO] Redacted disclosure pack files:")
        for entry in redacted_files:
            print(f"  - {entry}")

    if skipped_binary:
        print("[WARN] Skipped binary files:")
        for entry in skipped_binary:
            print(f"  - {entry}")

    if failures:
        print("[ERROR] Redaction incomplete in:")
        for entry in failures:
            print(f"  - {entry}")
        return 2

    print("[SUCCESS] Disclosure pack redaction complete.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Redact PII/secret patterns from disclosure pack artifacts."
    )
    parser.add_argument("--pack-dir", required=True, type=Path)
    parser.add_argument(
        "--denylist",
        default=Path("compliance/pii-denylist.txt"),
        type=Path,
    )
    parser.add_argument(
        "--secret-patterns",
        default=Path("compliance/secret-patterns.json"),
        type=Path,
    )
    args = parser.parse_args()

    if not args.pack_dir.exists():
        raise FileNotFoundError(f"Pack directory not found: {args.pack_dir}")

    exit_code = redact_pack(args.pack_dir, args.denylist, args.secret_patterns)
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
