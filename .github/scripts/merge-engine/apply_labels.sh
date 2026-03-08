#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
TRIAGE_CSV="${ROOT_DIR}/artifacts/pr_triage.csv"
DRY_RUN="${DRY_RUN:-1}"

if [[ ! -f "${TRIAGE_CSV}" ]]; then
  echo "Missing ${TRIAGE_CSV}. Run triage_prs.py first." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; authenticate with GH_TOKEN or gh auth login" >&2
  exit 1
fi

python3 - "${TRIAGE_CSV}" "${DRY_RUN}" <<'PY'
import csv
import subprocess
import sys
from pathlib import Path

csv_path = Path(sys.argv[1])
dry_run = sys.argv[2] == "1"

with csv_path.open("r", encoding="utf-8") as fh:
    rows = list(csv.DictReader(fh))

for row in rows:
    number = row["number"]
    labels = set()

    ci = row["ci_status"]
    if ci == "green":
        labels.add("ci-green")
    elif ci == "red":
        labels.add("ci-red")
    else:
        labels.add("ci-pending")

    if row["conflicts"] == "yes":
        labels.add("conflicts")

    if row.get("p0_candidate", "").lower() in {"true", "1", "yes"}:
        labels.add("P0-candidate")

    lane = row["lane"]
    labels.add(f"lane/{lane}")

    ordered = sorted(labels)
    if not ordered:
        continue

    cmd = ["gh", "pr", "edit", number]
    for label in ordered:
        cmd.extend(["--add-label", label])

    if dry_run:
        print("DRY_RUN", " ".join(cmd))
    else:
        print("EXEC", " ".join(cmd))
        subprocess.run(cmd, check=True)
PY
