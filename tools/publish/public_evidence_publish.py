#!/usr/bin/env python3
import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any

BADGE_ALLOWED_KEYS = {
    "schemaVersion",
    "label",
    "message",
    "color",
    "labelColor",
    "style",
    "logo",
    "logoColor",
    "namedLogo",
    "cacheSeconds",
}

SUMMARY_ALLOWED_KEYS = {
    "schemaVersion",
    "commit",
    "sbom",
    "attestation",
    "verification",
}

URL_DENYLIST = re.compile(r"(localhost|127\.0\.0\.1|github\.com/.+/actions)", re.IGNORECASE)


def assert_allowed_keys(payload: dict, allowed: set, label: str) -> None:
    extra = set(payload.keys()) - allowed
    if extra:
        raise ValueError(f"{label} contains disallowed keys: {sorted(extra)}")


def assert_no_private_urls(payload: Any) -> None:
    if isinstance(payload, dict):
        for value in payload.values():
            assert_no_private_urls(value)
    elif isinstance(payload, list):
        for value in payload:
            assert_no_private_urls(value)
    elif isinstance(payload, str):
        if URL_DENYLIST.search(payload):
            raise ValueError(f"Disallowed URL reference detected: {payload}")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish public-safe evidence payloads")
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--dest-dir", required=True)
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    dest_dir = Path(args.dest_dir) / args.commit
    badge_path = source_dir / "badge.json"
    summary_path = source_dir / "evidence.summary.json"

    if not badge_path.exists():
        raise FileNotFoundError(f"Missing badge.json in {source_dir}")
    if not summary_path.exists():
        raise FileNotFoundError(f"Missing evidence.summary.json in {source_dir}")

    badge = load_json(badge_path)
    summary = load_json(summary_path)

    assert_allowed_keys(badge, BADGE_ALLOWED_KEYS, "badge.json")
    assert_allowed_keys(summary, SUMMARY_ALLOWED_KEYS, "evidence.summary.json")
    assert_no_private_urls(badge)
    assert_no_private_urls(summary)

    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(badge_path, dest_dir / "badge.json")
    shutil.copy2(summary_path, dest_dir / "evidence.summary.json")

    print(f"Published public evidence to {dest_dir}")


if __name__ == "__main__":
    main()
