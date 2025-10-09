#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# GA Packet & Links Verifier
# - Ensures GA_SIGNOFF_PACKET.md exists and key links appear in the GA announcement.
# - Auto-infers RELEASE_ID (YYYY.MM.DD) from the latest *_GA_ANNOUNCEMENT.md if not provided.
# - Emits a human-readable report and (if available) a GitHub job summary.
# ------------------------------------------------------------------------------

RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; BLU=$'\e[34m'; RST=$'\e[0m'
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

RELEASE_ID="${RELEASE_ID:-}"
ANNOUNCE="${ANNOUNCE:-"docs/releases/${RELEASE_ID:-}/MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"}"
PACKET="${PACKET:-docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md}"
REPORT_DIR="${REPORT_DIR:-.ga-check}"
REPORT="${REPORT:-${REPORT_DIR}/report.txt}"
mkdir -p "$REPORT_DIR"

info(){ echo "${BLU}[info]${RST} $*" | tee -a "$REPORT" ; }
ok(){   echo "${GRN}[ok]${RST}   $*" | tee -a "$REPORT" ; }
warn(){ echo "${YLW}[warn]${RST} $*" | tee -a "$REPORT" ; }
fail(){ echo "${RED}[fail]${RST} $*" | tee -a "$REPORT" ; exit 1; }

# Discover latest GA announcement if RELEASE_ID not provided
discover_release_id() {
  local latest
  latest="$(ls -1 docs/releases/*_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md 2>/dev/null | sort -V | tail -n1 || true)"
  if [[ -z "${latest}" ]]; then
    fail "No GA announcement found at docs/releases/*_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
  fi
  local base fname
  fname="$(basename "$latest")"
  RELEASE_ID="${fname%%_*}"        # e.g., 2025.10.07
  ANNOUNCE="docs/releases/${RELEASE_ID}_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
  ok "Discovered RELEASE_ID=${RELEASE_ID} from ${fname}"
}

[[ -z "${RELEASE_ID}" ]] && discover_release_id || ok "Using RELEASE_ID=${RELEASE_ID}"
[[ -f "$ANNOUNCE" ]] || fail "Announcement not found: $ANNOUNCE"

# Expected repo files
declare -a REQUIRED_FILES=(
  ".github/workflows/nightly-verify.yml"
  "ops/tag-protection-ruleset.json"
  "ops/grafana/ga-health-dashboard.json"
  "RUNBOOK.md"
  "${PACKET}"
)

# Expected link substrings within the announcement
declare -a REQUIRED_LINKS=(
  ".github/workflows/nightly-verify.yml"
  "ops/tag-protection-ruleset.json"
  "ops/grafana/ga-health-dashboard.json"
  "RUNBOOK.md"
  "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md"
)

info "Checking required files exist"
for f in "${REQUIRED_FILES[@]}"; do
  [[ -f "$f" ]] && ok "Found $f" || fail "Missing required file: $f"
done

info "Validating required links are referenced in: $ANNOUNCE"
for link in "${REQUIRED_LINKS[@]}"; do
  if grep -qF "$link" "$ANNOUNCE"; then
    ok "Announcement links to $link"
  else
    fail "Announcement does not link to: $link"
  fi
done

# Sanity checks on the packet content
info "Validating GA packet content: $PACKET"
# Simple pattern matching for key sections
if grep -q "Go / No‑Go Checklist" "$PACKET"; then
  ok "Packet contains Go/No-Go Checklist"
else
  fail "Packet missing Go/No-Go Checklist section"
fi

if grep -q "Final Hardening" "$PACKET"; then
  ok "Packet contains Final Hardening section"
else
  warn "Packet missing explicit Final Hardening section header (expected ## 13) ...)"
fi

if grep -q "Acceptance Criteria" "$PACKET"; then
  ok "Packet contains Acceptance Criteria"
else
  fail "Packet missing Acceptance Criteria section"
fi

# Bonus: confirm the nightly schedule is documented in announcement
if grep -q "04:17 UTC" "$ANNOUNCE"; then
  ok "Announcement documents nightly verification schedule (04:17 UTC)"
else
  warn "Nightly schedule (04:17 UTC) not mentioned in announcement"
fi

ok "GA Packet & Links verification passed for RELEASE_ID=${RELEASE_ID}"

# Publish summary for GitHub Actions UI if available
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## GA Packet & Links — Verification Summary"
    echo "- **Release ID:** \`${RELEASE_ID}\`"
    echo "- **Announcement:** \`${ANNOUNCE}\`"
    echo ""
    echo "### Files"
    for f in "${REQUIRED_FILES[@]}"; do echo "- ✅ $f"; done
    echo ""
    echo "### Links present in announcement"
    for l in "${REQUIRED_LINKS[@]}"; do echo "- ✅ $l"; done
    echo ""
    echo "_Report saved at \`${REPORT}\`_"
  } >> "$GITHUB_STEP_SUMMARY"
fi