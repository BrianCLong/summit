#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
OUT_DIR="${ROOT_DIR}/artifacts"
JSON_OUT="${OUT_DIR}/pr_inventory.json"
CSV_OUT="${OUT_DIR}/pr_inventory.csv"
PR_LIMIT="${PR_LIMIT:-200}"

mkdir -p "${OUT_DIR}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; authenticate with GH_TOKEN or gh auth login" >&2
  exit 1
fi

# Fetch inventory in one batched call to reduce API pressure.
gh pr list \
  --state open \
  --limit "${PR_LIMIT}" \
  --json number,title,author,updatedAt,isDraft,mergeable,mergeStateStatus,statusCheckRollup,changedFiles,additions,deletions,labels,files \
  > "${JSON_OUT}"

python3 - <<'PY'
import csv
import json
from pathlib import Path

root = Path.cwd()
out_dir = root / "artifacts"
json_path = out_dir / "pr_inventory.json"
csv_path = out_dir / "pr_inventory.csv"

def ci_conclusion(status_rollup):
    if not status_rollup:
        return "pending"
    conclusions = []
    for check in status_rollup:
        value = (check.get("conclusion") or check.get("state") or "").lower()
        if value:
            conclusions.append(value)
    if not conclusions:
        return "pending"
    if any(v in {"failure", "timed_out", "cancelled", "action_required", "startup_failure"} for v in conclusions):
        return "failure"
    if any(v in {"pending", "queued", "in_progress", "requested", "waiting"} for v in conclusions):
        return "pending"
    return "success"

def has_conflicts(pr):
    mergeable = (pr.get("mergeable") or "").upper()
    state = (pr.get("mergeStateStatus") or "").upper()
    return mergeable == "CONFLICTING" or state in {"DIRTY", "UNKNOWN"}

with json_path.open("r", encoding="utf-8") as fh:
    prs = json.load(fh)

rows = []
for pr in prs:
    labels = [lbl.get("name", "") for lbl in pr.get("labels", []) if lbl.get("name")]
    files = [f.get("path", "") for f in pr.get("files", []) if f.get("path")]
    rows.append(
        {
            "number": pr.get("number"),
            "title": pr.get("title", ""),
            "author": (pr.get("author") or {}).get("login", ""),
            "updatedAt": pr.get("updatedAt", ""),
            "isDraft": bool(pr.get("isDraft", False)),
            "mergeable": pr.get("mergeable", ""),
            "mergeStateStatus": pr.get("mergeStateStatus", ""),
            "conflicts": "yes" if has_conflicts(pr) else "no",
            "ci_conclusion": ci_conclusion(pr.get("statusCheckRollup", [])),
            "changedFiles": pr.get("changedFiles", 0),
            "additions": pr.get("additions", 0),
            "deletions": pr.get("deletions", 0),
            "labels": "|".join(sorted(labels)),
            "files": "|".join(sorted(files)),
        }
    )

rows.sort(key=lambda r: int(r["number"]))
fields = [
    "number",
    "title",
    "author",
    "updatedAt",
    "isDraft",
    "mergeable",
    "mergeStateStatus",
    "conflicts",
    "ci_conclusion",
    "changedFiles",
    "additions",
    "deletions",
    "labels",
    "files",
]

with csv_path.open("w", encoding="utf-8", newline="") as fh:
    writer = csv.DictWriter(fh, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

print(f"wrote {json_path}")
print(f"wrote {csv_path}")
PY
