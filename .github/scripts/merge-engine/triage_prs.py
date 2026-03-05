#!/usr/bin/env python3
"""Deterministic PR triage and queue generation."""

from __future__ import annotations

import csv
import fnmatch
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
CONFIG_PATH = ROOT / ".github/merge-engine/config.yml"
INVENTORY_PATH = ROOT / "artifacts/pr_inventory.json"
TRIAGE_CSV_PATH = ROOT / "artifacts/pr_triage.csv"
QUEUE_MD_PATH = ROOT / "artifacts/pr_queue.md"


@dataclass(frozen=True)
class Config:
    lanes: list[str]
    risk_paths: list[str]
    large_pr_thresholds: dict[str, int]
    required_checks: dict[str, list[str]]
    batch_size_default: int
    tie_breaker_order: list[str]


def parse_inline_json_config(path: Path) -> Config:
    values: dict[str, Any] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.endswith("{"):
            continue
        if stripped == "}":
            continue
        if ":" not in stripped:
            continue
        key, raw = stripped.split(":", 1)
        key = key.strip()
        raw = raw.strip()
        if not raw:
            continue
        try:
            values[key] = json.loads(raw)
        except json.JSONDecodeError:
            values[key] = raw.strip('"')

    required_keys = {
        "lanes",
        "risk_paths",
        "large_pr_thresholds",
        "required_checks",
        "batch_size_default",
        "tie_breaker_order",
    }
    missing = sorted(required_keys - values.keys())
    if missing:
        raise ValueError(f"Missing required config keys: {', '.join(missing)}")

    return Config(
        lanes=list(values["lanes"]),
        risk_paths=list(values["risk_paths"]),
        large_pr_thresholds=dict(values["large_pr_thresholds"]),
        required_checks=dict(values["required_checks"]),
        batch_size_default=int(values["batch_size_default"]),
        tie_breaker_order=list(values["tie_breaker_order"]),
    )


def parse_ts(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts).astimezone(UTC)


def ci_state(pr: dict[str, Any]) -> str:
    rollup = pr.get("statusCheckRollup") or []
    states: list[str] = []
    for check in rollup:
        value = (check.get("conclusion") or check.get("state") or "").lower()
        if value:
            states.append(value)
    if not states:
        return "pending"
    if any(v in {"failure", "timed_out", "cancelled", "action_required", "startup_failure"} for v in states):
        return "red"
    if any(v in {"pending", "queued", "in_progress", "requested", "waiting"} for v in states):
        return "pending"
    return "green"


def has_conflicts(pr: dict[str, Any]) -> bool:
    mergeable = (pr.get("mergeable") or "").upper()
    merge_state = (pr.get("mergeStateStatus") or "").upper()
    return mergeable == "CONFLICTING" or merge_state == "DIRTY"


def files_from_pr(pr: dict[str, Any]) -> list[str]:
    files = []
    for entry in pr.get("files", []) or []:
        if isinstance(entry, dict) and entry.get("path"):
            files.append(str(entry["path"]))
    return sorted(files)


def matches_risk(files: list[str], patterns: list[str]) -> bool:
    for f in files:
        for pattern in patterns:
            if fnmatch.fnmatch(f, pattern):
                return True
    return False


def lane_for_pr(pr: dict[str, Any], config: Config) -> tuple[str, str, bool, bool, str]:
    labels = {lbl.get("name", "") for lbl in pr.get("labels", []) if lbl.get("name")}
    files = files_from_pr(pr)
    risk = matches_risk(files, config.risk_paths)
    ci = ci_state(pr)
    conflicts = has_conflicts(pr)
    changed_files = int(pr.get("changedFiles") or 0)
    lines_changed = int(pr.get("additions") or 0) + int(pr.get("deletions") or 0)
    is_large = (
        changed_files >= int(config.large_pr_thresholds.get("files_changed", 0))
        or lines_changed >= int(config.large_pr_thresholds.get("lines_changed", 0))
    )

    if "quarantine" in labels:
        return "quarantine", "explicit quarantine label", risk, is_large, ci
    if is_large and (conflicts or ci != "green"):
        return "capture-close", "large and blocked", risk, is_large, ci
    if conflicts:
        return "conflicts", "merge conflicts detected", risk, is_large, ci
    if risk and ci != "green":
        return "quarantine", "risk-path and CI not green", risk, is_large, ci
    if ci == "red":
        return "fix-forward", "CI failed", risk, is_large, ci
    if ci == "green" and not is_large:
        return "auto-merge", "green CI and low risk", risk, is_large, ci
    return "capture-close", "pending or oversized", risk, is_large, ci


def queue_sort_key(entry: dict[str, Any]) -> tuple[Any, ...]:
    # Ordered by: ci-green > conflicts:no > low-risk > newest, plus PR number tie-break.
    return (
        0 if entry["ci_status"] == "green" else 1,
        0 if entry["conflicts"] == "no" else 1,
        0 if not entry["risk_path"] else 1,
        -entry["updated_ts"].timestamp(),
        int(entry["number"]),
    )


def main() -> None:
    config = parse_inline_json_config(CONFIG_PATH)
    prs: list[dict[str, Any]] = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))

    triaged: list[dict[str, Any]] = []
    for pr in prs:
        lane, reason, risk_path, is_large, ci_status = lane_for_pr(pr, config)
        updated_ts = parse_ts(pr.get("updatedAt"))
        triaged.append(
            {
                "number": int(pr["number"]),
                "title": pr.get("title", ""),
                "author": (pr.get("author") or {}).get("login", ""),
                "updatedAt": pr.get("updatedAt", ""),
                "updated_ts": updated_ts,
                "isDraft": bool(pr.get("isDraft", False)),
                "lane": lane,
                "lane_reason": reason,
                "ci_status": ci_status,
                "conflicts": "yes" if has_conflicts(pr) else "no",
                "risk_path": risk_path,
                "p0_candidate": risk_path or ("P0" in {lbl.get("name", "") for lbl in pr.get("labels", [])}),
                "changedFiles": int(pr.get("changedFiles") or 0),
                "additions": int(pr.get("additions") or 0),
                "deletions": int(pr.get("deletions") or 0),
                "is_large": is_large,
                "required_checks": "|".join(config.required_checks.get(lane, [])),
            }
        )

    triaged.sort(key=queue_sort_key)

    for idx, entry in enumerate(triaged, start=1):
        entry["queue_rank"] = idx

    TRIAGE_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "queue_rank",
        "number",
        "title",
        "author",
        "updatedAt",
        "lane",
        "lane_reason",
        "ci_status",
        "conflicts",
        "risk_path",
        "p0_candidate",
        "changedFiles",
        "additions",
        "deletions",
        "is_large",
        "required_checks",
    ]
    with TRIAGE_CSV_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for entry in triaged:
            row = {k: entry[k] for k in fields}
            writer.writerow(row)

    lines = [
        "# Deterministic Merge Queue",
        "",
        "Ordered by: ci-green > conflicts:no > low-risk > newest > pr-number.",
        "",
    ]
    for entry in triaged:
        lines.append(
            f"{entry['queue_rank']:03d}. PR #{entry['number']} - {entry['title']} "
            f"(`{entry['lane']}`; ci={entry['ci_status']}; conflicts={entry['conflicts']}; "
            f"risk={'yes' if entry['risk_path'] else 'no'}) :: {entry['lane_reason']}"
        )

    QUEUE_MD_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"wrote {TRIAGE_CSV_PATH}")
    print(f"wrote {QUEUE_MD_PATH}")


if __name__ == "__main__":
    main()
