#!/usr/bin/env bash
set -euo pipefail

HELM_BIN=${HELM_BIN:-helm}
AUDIT_LOG=${AUDIT_LOG:-runs/audit/canary-rollbacks.log}
ALERT_AUDIT_LOG=${ALERT_AUDIT_LOG:-audit/alert_log.json}
EVIDENCE_DIR=${EVIDENCE_DIR:-evidence/rollbacks}
DRY_RUN=false
REVISION=""
SERVICE=""
ENVIRONMENT=""
REASON="Auto rollback triggered"
ACTOR=${ACTOR:-"auto-controller"}
EVIDENCE_URL=""
ROLLBACK_ID="canary-rollback-$(date +%Y%m%d-%H%M%S)"

usage() {
  cat <<USAGE
Canary rollback playbook
Usage: $0 --service <name> --environment <env> [--revision <rev>] [--reason <text>] [--actor <id>] [--audit-log <path>] [--evidence-url <url>] [--dry-run]

Environment variables:
  HELM_BIN   Override helm binary (default: helm)
  AUDIT_LOG  Default audit log file (default: runs/audit/canary-rollbacks.log)
  ALERT_AUDIT_LOG  Secondary audit log (default: audit/alert_log.json)
  EVIDENCE_DIR  Evidence output directory (default: evidence/rollbacks)
  ACTOR      Default actor recorded in audit logs (default: auto-controller)
USAGE
}

log() {
  printf '%s %s\n' "$(date -Iseconds)" "$*"
}

append_audit() {
  local release="$1"
  local revision="$2"
  local reason="$3"
  local actor="$4"
  local log_path="$5"
  local evidence_url="$6"
  local rollback_id="$7"
  mkdir -p "$(dirname "$log_path")"
  jq -n \
    --arg ts "$(date -Iseconds)" \
    --arg release "$release" \
    --arg revision "$revision" \
    --arg reason "$reason" \
    --arg actor "$actor" \
    --arg evidence_url "$evidence_url" \
    --arg rollback_id "$rollback_id" \
    '{timestamp:$ts, event_type:"canary_rollback", rollback_id:$rollback_id, release:$release, revision:$revision, reason:$reason, actor:$actor, evidence_url:$evidence_url}' >>"$log_path"
}

append_alert_audit() {
  local release="$1"
  local revision="$2"
  local reason="$3"
  local actor="$4"
  local log_path="$5"
  local evidence_url="$6"
  local rollback_id="$7"
  mkdir -p "$(dirname "$log_path")"
  printf '%s ALERT service=%s type=canary_rollback revision=%s actor=%s reason="%s" evidence_url=%s rollback_id=%s\n' \
    "$(date -Iseconds)" \
    "$release" \
    "$revision" \
    "$actor" \
    "$reason" \
    "${evidence_url:-n/a}" \
    "$rollback_id" >>"$log_path"
}

write_evidence_record() {
  local release="$1"
  local revision="$2"
  local reason="$3"
  local actor="$4"
  local evidence_url="$5"
  local rollback_id="$6"
  local evidence_dir="${EVIDENCE_DIR}/${rollback_id}"
  mkdir -p "$evidence_dir"
  jq -n \
    --arg id "$rollback_id" \
    --arg ts "$(date -Iseconds)" \
    --arg release "$release" \
    --arg revision "$revision" \
    --arg reason "$reason" \
    --arg actor "$actor" \
    --arg evidence_url "$evidence_url" \
    --arg audit_log "$AUDIT_LOG" \
    --arg alert_audit_log "$ALERT_AUDIT_LOG" \
    '{
      rollback_id:$id,
      timestamp:$ts,
      release:$release,
      revision:$revision,
      reason:$reason,
      actor:$actor,
      evidence_url:$evidence_url,
      audit_log:$audit_log,
      alert_audit_log:$alert_audit_log
    }' >"${evidence_dir}/rollback-evidence.json"
  log "Evidence record written to ${evidence_dir}/rollback-evidence.json"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --revision)
      REVISION="$2"
      shift 2
      ;;
    --reason)
      REASON="$2"
      shift 2
      ;;
    --actor)
      ACTOR="$2"
      shift 2
      ;;
    --audit-log)
      AUDIT_LOG="$2"
      shift 2
      ;;
    --evidence-url)
      EVIDENCE_URL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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

if [[ -z "$SERVICE" || -z "$ENVIRONMENT" ]]; then
  echo "Both --service and --environment must be provided" >&2
  usage
  exit 1
fi

RELEASE_NAME="${SERVICE}-${ENVIRONMENT}"
COMMAND=($HELM_BIN rollback "$RELEASE_NAME")
if [[ -n "$REVISION" ]]; then
  COMMAND+=("$REVISION")
fi
COMMAND+=("--cleanup-on-fail")

log "Initiating rollback for ${RELEASE_NAME} (revision: ${REVISION:-latest})"
log "Reason: ${REASON}"
if [[ "$DRY_RUN" == true ]]; then
  log "Dry run enabled. Not executing helm rollback."
else
  if ! command -v "$HELM_BIN" >/dev/null 2>&1; then
    echo "Helm binary '$HELM_BIN' not found" >&2
    exit 2
  fi
  "${COMMAND[@]}"
fi

append_audit "$RELEASE_NAME" "${REVISION:-latest}" "$REASON" "$ACTOR" "$AUDIT_LOG" "$EVIDENCE_URL" "$ROLLBACK_ID"
append_alert_audit "$RELEASE_NAME" "${REVISION:-latest}" "$REASON" "$ACTOR" "$ALERT_AUDIT_LOG" "$EVIDENCE_URL" "$ROLLBACK_ID"
write_evidence_record "$RELEASE_NAME" "${REVISION:-latest}" "$REASON" "$ACTOR" "$EVIDENCE_URL" "$ROLLBACK_ID"
log "Rollback recorded to $AUDIT_LOG"
