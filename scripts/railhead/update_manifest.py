#!/usr/bin/env python3
"""Utility helpers for maintaining Railhead run manifests."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


def _load_manifest(path: Path) -> Dict[str, Any]:
    if path.exists():
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    return {
        "run_id": None,
        "created_at": None,
        "config": None,
        "artifacts": [],
    }


def _write_manifest(path: Path, manifest: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, sort_keys=False)
        fh.write("\n")


def cmd_init(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest)
    manifest = {
        "run_id": args.run_id,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "config": args.config,
        "artifacts": [],
    }
    _write_manifest(manifest_path, manifest)


def _ensure_manifest_defaults(manifest: Dict[str, Any]) -> None:
    manifest.setdefault("artifacts", [])


def cmd_add(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest)
    manifest = _load_manifest(manifest_path)
    _ensure_manifest_defaults(manifest)

    metadata: Dict[str, Any]
    if args.metadata:
        metadata = json.loads(args.metadata)
    else:
        metadata = {}

    entry = {
        "category": args.category,
        "path": args.path,
        "description": args.description,
        "metadata": metadata,
    }

    existing = manifest["artifacts"]
    updated = []
    replaced = False
    for candidate in existing:
        if candidate.get("path") == entry["path"]:
            updated.append(entry)
            replaced = True
        else:
            updated.append(candidate)
    if not replaced:
        updated.append(entry)

    manifest["artifacts"] = sorted(updated, key=lambda item: (item["category"], item["path"]))
    _write_manifest(manifest_path, manifest)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="initialize a manifest for a run")
    init_parser.add_argument("--manifest", required=True)
    init_parser.add_argument("--run-id", required=True)
    init_parser.add_argument("--config", required=True)
    init_parser.set_defaults(func=cmd_init)

    add_parser = subparsers.add_parser("add", help="append an artifact entry to the manifest")
    add_parser.add_argument("--manifest", required=True)
    add_parser.add_argument("--category", required=True)
    add_parser.add_argument("--path", required=True)
    add_parser.add_argument("--description", required=True)
    add_parser.add_argument("--metadata", default="{}")
    add_parser.set_defaults(func=cmd_add)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
