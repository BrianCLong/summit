#!/usr/bin/env bash
set -euo pipefail

RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; BLU=$'\e[34m'; RST=$'\e[0m'
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

RELEASE_ID="${RELEASE_ID:-}"
PACKET="${PACKET:-docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md}"
SHEET="${SHEET:-docs/releases/ga-signoff/GA_SIGNOFF_SHEET.md}"
QUICK="${QUICK:-docs/releases/ga-signoff/GA_QUICK_SIGNOFF.md}"
ANNOUNCE="${ANNOUNCE:-docs/releases/${RELEASE_ID:-2025.10.07}_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md}"
REPORT_DIR="${REPORT_DIR:-.ga-check}"; REPORT="${REPORT_DIR}/report.txt"; mkdir -p "$REPORT_DIR"

info(){ echo "${BLU}[info]${RST} $*" | tee -a "$REPORT" ; }
ok(){   echo "${GRN}[ok]${RST}   $*" | tee -a "$REPORT" ; }
warn(){ echo "${YLW}[warn]${RST} $*" | tee -a "$REPORT" ; }
fail(){ echo "${RED}[fail]${RST} $*" | tee -a "$REPORT" ; exit 1; }

# Discover announcement if not provided
if [[ -z "${RELEASE_ID}" ]]; then
  latest="$(ls -1 docs/releases/*_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md 2>/dev/null | sort -V | tail -n1 || true)"
  [[ -n "$latest" ]] || fail "No GA announcement found"
  ANNOUNCE="$latest"
  RELEASE_ID="$(basename "$latest" | sed 's/_.*//')"
  ok "Discovered RELEASE_ID=$RELEASE_ID"
fi

# Required files
info "Checking required files exist"
for f in \
  ".github/workflows/nightly-verify.yml" \
  "ops/tag-protection-ruleset.json" \
  "ops/grafana/ga-health-dashboard.json" \
  "RUNBOOK.md" \
  "$PACKET" "$SHEET" "$QUICK"
do
  [[ -f "$f" ]] && ok "Found $f" || fail "Missing required file: $f"
done

# Links present in announcement
info "Validating required links are referenced in: $ANNOUNCE"
for l in \
  ".github/workflows/nightly-verify.yml" \
  "ops/tag-protection-ruleset.json" \
  "ops/grafana/ga-health-dashboard.json" \
  "RUNBOOK.md" \
  "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md" \
  "docs/releases/ga-signoff/GA_SIGNOFF_SHEET.md" \
  "docs/releases/ga-signoff/GA_QUICK_SIGNOFF.md"
do
  if grep -qF "$l" "$ANNOUNCE"; then
    ok "Announcement links to $l"
  else
    fail "Announcement does not link to: $l"
  fi
done

# Packet sanity sections
info "Validating GA packet content: docs/releases/GA_SIGNOFF_PACKET.md"
grep -qiE '^##[[:space:]]+Go[[:space:]]*/[[:space:]]*No-?Go Checklist' docs/releases/GA_SIGNOFF_PACKET.md \
  && ok "Canonical packet contains Go/No-Go Checklist" || warn "Canonical packet missing Go/No-Go Checklist section"

grep -qiE '^##[[:space:]]+Final Verification Summary' docs/releases/GA_SIGNOFF_PACKET.md \
  && ok "Canonical packet contains Final Verification Summary" || warn "Canonical packet missing Final Verification Summary section"

ok "GA Packet & Links verification passed for RELEASE_ID=${RELEASE_ID}"

# Publish summary for GitHub Actions UI if available
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## GA Packet & Links — Verification Summary"
    echo "- **Release ID:** \`${RELEASE_ID}\`"
    echo "- **Announcement:** \`${ANNOUNCE}\`"
    echo ""
    echo "### Files"
    for f in \
      ".github/workflows/nightly-verify.yml" \
      "ops/tag-protection-ruleset.json" \
      "ops/grafana/ga-health-dashboard.json" \
      "RUNBOOK.md" \
      "$PACKET" "$SHEET" "$QUICK"
    do echo "- ✅ $f"; done
    echo ""
    echo "### Links present in announcement"
    for l in \
      ".github/workflows/nightly-verify.yml" \
      "ops/tag-protection-ruleset.json" \
      "ops/grafana/ga-health-dashboard.json" \
      "RUNBOOK.md" \
      "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md" \
      "docs/releases/ga-signoff/GA_SIGNOFF_SHEET.md" \
      "docs/releases/ga-signoff/GA_QUICK_SIGNOFF.md"
    do echo "- ✅ $l"; done
    echo ""
    echo "_Report saved at \`${REPORT}\`_"
  } >> "$GITHUB_STEP_SUMMARY"
fi