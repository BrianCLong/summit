from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Optional


STANDARD_FILES = ("report", "metrics", "stamp")


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _coerce_item(raw: object) -> dict:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, list):
        return {"files": raw}
    if isinstance(raw, str):
        return {"files": [raw]}
    return {}


def _extract_from_list(paths: Iterable[object]) -> tuple[Optional[str], Optional[str], Optional[str], list[str]]:
    report = None
    metrics = None
    stamp = None
    extra: list[str] = []
    for value in paths:
        if not isinstance(value, str):
            continue
        name = Path(value).name
        if name == "report.json" and report is None:
            report = value
        elif name == "metrics.json" and metrics is None:
            metrics = value
        elif name == "stamp.json" and stamp is None:
            stamp = value
        else:
            extra.append(value)
    return report, metrics, stamp, extra


def normalize_entry(evidence_id: Optional[str], raw: object) -> dict:
    item = _coerce_item(raw)
    files_field = item.get("files")
    artifacts_field = item.get("artifacts")
    paths_field = item.get("paths")

    report = item.get("report")
    metrics = item.get("metrics")
    stamp = item.get("stamp")
    extra_files: list[str] = []

    if isinstance(files_field, dict):
        report = report or files_field.get("report")
        metrics = metrics or files_field.get("metrics")
        stamp = stamp or files_field.get("stamp")
        for key, value in files_field.items():
            if key in STANDARD_FILES:
                continue
            if isinstance(value, str):
                extra_files.append(value)
    else:
        list_paths: list[object] = []
        if isinstance(files_field, list):
            list_paths.extend(files_field)
        if isinstance(artifacts_field, list):
            list_paths.extend(artifacts_field)
        if isinstance(paths_field, list):
            list_paths.extend(paths_field)
        list_report, list_metrics, list_stamp, list_extra = _extract_from_list(list_paths)
        report = report or list_report
        metrics = metrics or list_metrics
        stamp = stamp or list_stamp
        extra_files.extend(list_extra)

    normalized = {
        "evidence_id": evidence_id or item.get("evidence_id"),
        "files": {"report": report, "metrics": metrics, "stamp": stamp},
        "extra_files": extra_files,
        "raw": item,
    }
    return normalized


def normalize_index(index: object) -> list[dict]:
    if not isinstance(index, dict):
        return []

    items = index.get("items")
    if items is None:
        items = index.get("evidence")
    if items is None:
        items = index.get("entries")

    entries: list[dict] = []
    if isinstance(items, list):
        for raw in items:
            evidence_id = raw.get("evidence_id") if isinstance(raw, dict) else None
            entries.append(normalize_entry(evidence_id, raw))
        return entries

    if isinstance(items, dict):
        for evidence_id, raw in items.items():
            entries.append(normalize_entry(evidence_id, raw))
        return entries

    return entries


def normalize_index_from_path(index_path: Path) -> list[dict]:
    return normalize_index(load_json(index_path))


def iter_entry_files(entry: dict) -> list[str]:
    files = entry.get("files", {})
    resolved: list[str] = []
    for key in STANDARD_FILES:
        value = files.get(key)
        if isinstance(value, str):
            resolved.append(value)
    for extra in entry.get("extra_files", []):
        if isinstance(extra, str):
            resolved.append(extra)
    return resolved
