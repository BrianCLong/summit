#!/usr/bin/env bash
set -euo pipefail

HELM_BIN=${HELM_BIN:-helm}
AUDIT_LOG=${AUDIT_LOG:-runs/audit/canary-rollbacks.log}
DRY_RUN=false
REVISION=""
SERVICE=""
ENVIRONMENT=""
REASON="Auto rollback triggered"
ACTOR=${ACTOR:-"auto-controller"}

usage() {
  cat <<USAGE
Canary rollback playbook
Usage: $0 --service <name> --environment <env> [--revision <rev>] [--reason <text>] [--actor <id>] [--audit-log <path>] [--dry-run]

Environment variables:
  HELM_BIN   Override helm binary (default: helm)
  AUDIT_LOG  Default audit log file (default: runs/audit/canary-rollbacks.log)
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
  mkdir -p "$(dirname "$log_path")"
  jq -n \
    --arg ts "$(date -Iseconds)" \
    --arg release "$release" \
    --arg revision "$revision" \
    --arg reason "$reason" \
    --arg actor "$actor" \
    '{timestamp:$ts, release:$release, revision:$revision, reason:$reason, actor:$actor}' >>"$log_path"
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

append_audit "$RELEASE_NAME" "${REVISION:-latest}" "$REASON" "$ACTOR" "$AUDIT_LOG"
log "Rollback recorded to $AUDIT_LOG"
