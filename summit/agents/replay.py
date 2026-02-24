from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


def _canonical(value: dict[str, Any]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _digest(value: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _flatten(value: Any, prefix: str = "$") -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for key in sorted(value):
            entries.extend(_flatten(value[key], f"{prefix}.{key}"))
        return entries
    if isinstance(value, list):
        for idx, nested in enumerate(value):
            entries.extend(_flatten(nested, f"{prefix}[{idx}]"))
        return entries
    entries.append((prefix, json.dumps(value, sort_keys=True)))
    return entries


def compute_replay_diff(baseline: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    baseline_flat = dict(_flatten(baseline))
    current_flat = dict(_flatten(current))
    all_keys = sorted(set(baseline_flat) | set(current_flat))

    changed: list[dict[str, str | None]] = []
    for key in all_keys:
        left = baseline_flat.get(key)
        right = current_flat.get(key)
        if left != right:
            changed.append({"path": key, "baseline": left, "current": right})

    return {
        "baseline_hash": _digest(baseline),
        "current_hash": _digest(current),
        "match": len(changed) == 0,
        "changed": changed,
    }


def write_replay_diff(path: str | Path, diff: dict[str, Any]) -> None:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(diff, indent=2, sort_keys=True) + "\n", encoding="utf-8")
