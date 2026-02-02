#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
QUERY_FILE="$ROOT_DIR/metrics/sql/030_gmr_gate_query.sql"
EVIDENCE_ROOT="$ROOT_DIR/metrics/evidence"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ ! -f "$QUERY_FILE" ]]; then
  echo "Gate query not found at $QUERY_FILE" >&2
  exit 1
fi

rows=$(psql "$DATABASE_URL" -t -A -F $'\t' -f "$QUERY_FILE")

if [[ -z "$rows" ]]; then
  echo "No GMR rows returned from gate query" >&2
  exit 1
fi

export EVIDENCE_ROOT
printf '%s\n' "$rows" | python3 - <<'PY'
import json
import os
import sys
from pathlib import Path

rows_raw = sys.stdin.read().strip().splitlines()
rows = [json.loads(line.split("\t")[-1]) for line in rows_raw if line.strip()]

if not rows:
    raise SystemExit("No GMR rows parsed from gate query")

evidence_root = Path(os.environ["EVIDENCE_ROOT"])

failed = False

for row in rows:
    reasons = []
    gmr = row.get("gmr")
    cdc_rows = row.get("cdc_rows_total")
    missing_cdc = row.get("missing_cdc")
    missing_graph = row.get("missing_graph")
    median_30d = row.get("median_30d")
    mad_30d = row.get("mad_30d")
    pipeline_hash = row.get("pipeline_hash") or ""
    pipeline_hash_unchanged = bool(row.get("pipeline_hash_unchanged"))

    if missing_cdc or missing_graph:
        reasons.append("missing_metrics")

    if cdc_rows and cdc_rows > 0 and (gmr is None or gmr == 0):
        reasons.append("zero_gmr")

    if gmr is not None and median_30d is not None and mad_30d is not None and mad_30d > 0:
        if abs(gmr - median_30d) > 3 * mad_30d:
            reasons.append("mad_drift")
            if pipeline_hash_unchanged:
                reasons.append("hash_stable_drift")

    status = "fail" if reasons else "pass"
    if status == "fail":
        failed = True

    window_start = row["ts_window_start"]
    evidence_id = f"gmr/{window_start}/{pipeline_hash[:8] or 'nohash'}"
    evidence_dir = evidence_root / evidence_id
    evidence_dir.mkdir(parents=True, exist_ok=True)

    metrics_payload = {"gmr_gate": row}
    report_payload = {
        "status": status,
        "reasons": reasons,
        "thresholds": {
            "mad_multiplier": 3,
            "median_30d": median_30d,
            "mad_30d": mad_30d,
        },
    }
    stamp_payload = {
        "evidence_id": evidence_id,
        "ts_window_start": row["ts_window_start"],
        "ts_window_end": row["ts_window_end"],
        "pipeline_hash": pipeline_hash,
        "status": status,
        "reasons": reasons,
    }

    (evidence_dir / "metrics.json").write_text(json.dumps(metrics_payload, sort_keys=True, indent=2))
    (evidence_dir / "report.json").write_text(json.dumps(report_payload, sort_keys=True, indent=2))
    (evidence_dir / "stamp.json").write_text(json.dumps(stamp_payload, sort_keys=True, indent=2))

if failed:
    raise SystemExit(2)
PY
