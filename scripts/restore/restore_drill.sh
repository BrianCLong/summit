#!/bin/bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./scripts/restore/restore_drill.sh \
  --backup-timestamp <ISO-8601> \
  [--restore-start <ISO-8601>] \
  [--restore-end <ISO-8601>] \
  [--rto-limit-minutes <minutes>] \
  [--rpo-limit-minutes <minutes>] \
  [--evidence-dir <path>] \
  [--system <name>]

Required:
  --backup-timestamp      Timestamp of the last successful backup (UTC, ISO-8601).

Optional:
  --restore-start         Timestamp when restore work began (UTC, ISO-8601).
  --restore-end           Timestamp when restore completed (UTC, ISO-8601).
  --rto-limit-minutes     RTO threshold in minutes (default: 60).
  --rpo-limit-minutes     RPO threshold in minutes (default: 15).
  --evidence-dir          Evidence output directory (default: artifacts/restore-drills).
  --system                System identifier for the drill (default: intelgraph).

Example:
  ./scripts/restore/restore_drill.sh \
    --backup-timestamp "2026-01-01T11:45:00Z" \
    --restore-start "2026-01-01T12:00:00Z" \
    --restore-end "2026-01-01T12:35:00Z"
USAGE
}

backup_timestamp=""
restore_start=""
restore_end=""
rto_limit_minutes=60
rpo_limit_minutes=15
evidence_dir="evidence/restore-drills"
system_name="intelgraph"

while [ $# -gt 0 ]; do
  case "$1" in
    --backup-timestamp)
      backup_timestamp="$2"
      shift 2
      ;;
    --restore-start)
      restore_start="$2"
      shift 2
      ;;
    --restore-end)
      restore_end="$2"
      shift 2
      ;;
    --rto-limit-minutes)
      rto_limit_minutes="$2"
      shift 2
      ;;
    --rpo-limit-minutes)
      rpo_limit_minutes="$2"
      shift 2
      ;;
    --evidence-dir)
      evidence_dir="$2"
      shift 2
      ;;
    --system)
      system_name="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac

done

if [ -z "$backup_timestamp" ]; then
  echo "Error: --backup-timestamp is required." >&2
  usage
  exit 1
fi

if [ -z "$restore_start" ]; then
  restore_start=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

backup_epoch=$(date -u -d "$backup_timestamp" +%s)
restore_start_epoch=$(date -u -d "$restore_start" +%s)

if [ -z "$restore_end" ]; then
  restore_end=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

restore_end_epoch=$(date -u -d "$restore_end" +%s)

rto_seconds=$((restore_end_epoch - restore_start_epoch))
rpo_seconds=$((restore_start_epoch - backup_epoch))

if [ "$rto_seconds" -lt 0 ] || [ "$rpo_seconds" -lt 0 ]; then
  echo "Error: Computed RTO/RPO cannot be negative. Check timestamps." >&2
  exit 1
fi

rto_limit_seconds=$((rto_limit_minutes * 60))
rpo_limit_seconds=$((rpo_limit_minutes * 60))

rto_met=false
rpo_met=false

if [ "$rto_seconds" -le "$rto_limit_seconds" ]; then
  rto_met=true
fi

if [ "$rpo_seconds" -le "$rpo_limit_seconds" ]; then
  rpo_met=true
fi

overall_status="failed"
if [ "$rto_met" = true ] && [ "$rpo_met" = true ]; then
  overall_status="passed"
fi

mkdir -p "$evidence_dir"

drill_timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
evidence_file="${evidence_dir}/restore-drill-${drill_timestamp}.json"

cat <<EOF_JSON > "$evidence_file"
{
  "drill_id": "restore-drill-${drill_timestamp}",
  "system": "${system_name}",
  "backup_timestamp": "${backup_timestamp}",
  "restore_start": "${restore_start}",
  "restore_end": "${restore_end}",
  "rto_seconds": ${rto_seconds},
  "rpo_seconds": ${rpo_seconds},
  "rto_limit_minutes": ${rto_limit_minutes},
  "rpo_limit_minutes": ${rpo_limit_minutes},
  "rto_met": ${rto_met},
  "rpo_met": ${rpo_met},
  "status": "${overall_status}",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "authority": {
    "summit_readiness_assertion": "docs/SUMMIT_READINESS_ASSERTION.md",
    "constitution": "docs/governance/CONSTITUTION.md",
    "meta_governance": "docs/governance/META_GOVERNANCE.md"
  }
}
EOF_JSON

echo "Restore drill evidence written to ${evidence_file}"

echo "RTO: ${rto_seconds}s (limit ${rto_limit_seconds}s) => ${rto_met}"
echo "RPO: ${rpo_seconds}s (limit ${rpo_limit_seconds}s) => ${rpo_met}"
echo "Status: ${overall_status}"

if [ "$overall_status" != "passed" ]; then
  exit 2
fi
