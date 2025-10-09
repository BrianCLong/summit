#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Final GA Release Verification Script
# - Confirms all artifacts are in place and properly linked
# - Verifies the release is ready for production
# ------------------------------------------------------------------------------

RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; BLU=$'\e[34m'; RST=$'\e[0m'
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

info(){ echo "${BLU}[info]${RST} $*" ; }
ok(){   echo "${GRN}[ok]${RST}   $*" ; }
warn(){ echo "${YLW}[warn]${RST} $*" ; }
fail(){ echo "${RED}[fail]${RST} $*" ; exit 1; }

# Check that we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "feature/docker-ga-release-v2025.10.07" ]]; then
  warn "Not on expected branch: feature/docker-ga-release-v2025.10.07 (currently on $CURRENT_BRANCH)"
fi

# Check that the tag exists
TAG="v2025.10.07"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  ok "Release tag $TAG exists"
else
  warn "Release tag $TAG does not exist locally"
fi

# Check that all required files are present
declare -a REQUIRED_FILES=(
  "docs/releases/2025.10.07_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
  "MAESTRO_CONDUCTOR_GA_SUMMARY.md"
  "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md"
  "docs/releases/ga-signoff/GA_SIGNOFF_SHEET.md"
  "docs/releases/ga-signoff/GA_QUICK_SIGNOFF.md"
  "dist/release-manifest-v2025.10.07.yaml"
  "dist/release-attestation-v2025.10.07.jsonld"
  "dist/evidence-v0.3.2-mc-nightly.json"
  "scripts/gen-release-manifest.mjs"
  "scripts/gen-release-attestation.mjs"
  "scripts/verify-release-manifest.mjs"
  "scripts/check-ga-packet.sh"
  ".github/workflows/release-artifacts.yml"
  ".github/workflows/check-ga-packet.yml"
)

info "Checking required files exist..."
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    ok "Found $f"
  else
    fail "Missing required file: $f"
  fi
done

# Check that all required links are present in the announcement
ANNOUNCEMENT="docs/releases/2025.10.07_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
declare -a REQUIRED_LINKS=(
  ".github/workflows/nightly-verify.yml"
  "ops/tag-protection-ruleset.json"
  "ops/grafana/ga-health-dashboard.json"
  "RUNBOOK.md"
  "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md"
)

info "Validating required links are referenced in: $ANNOUNCEMENT..."
for link in "${REQUIRED_LINKS[@]}"; do
  if grep -qF "$link" "$ANNOUNCEMENT"; then
    ok "Announcement links to $link"
  else
    fail "Announcement does not link to: $link"
  fi
done

# Check that the scripts are executable
declare -a EXECUTABLE_SCRIPTS=(
  "scripts/gen-release-manifest.mjs"
  "scripts/gen-release-attestation.mjs"
  "scripts/verify-release-manifest.mjs"
  "scripts/check-ga-packet.sh"
)

info "Checking that scripts are executable..."
for s in "${EXECUTABLE_SCRIPTS[@]}"; do
  if [[ -x "$s" ]]; then
    ok "$s is executable"
  else
    fail "$s is not executable"
  fi
done

# Run the GA packet verification script
info "Running GA packet verification..."
if ./scripts/check-ga-packet.sh; then
  ok "GA packet verification passed"
else
  fail "GA packet verification failed"
fi

# Check that npm scripts exist
info "Checking that npm scripts exist..."
if npm run | grep -q "release:manifest"; then
  ok "release:manifest script exists"
else
  fail "release:manifest script missing"
fi

if npm run | grep -q "release:attest"; then
  ok "release:attest script exists"
else
  fail "release:attest script missing"
fi

if npm run | grep -q "release:verify"; then
  ok "release:verify script exists"
else
  fail "release:verify script missing"
fi

if npm run | grep -q "check:ga"; then
  ok "check:ga script exists"
else
  fail "check:ga script missing"
fi

# Verify that the generated artifacts have valid hashes
info "Verifying generated artifact hashes..."
if node scripts/verify-release-manifest.mjs --tag=v2025.10.07; then
  ok "All artifact hashes verified successfully!"
else
  fail "Some artifacts failed verification"
fi

echo ""
echo "🎉 Maestro Conductor v2025.10.07 GA Release Verification Complete!"
echo "✅ All checks passed - release is ready for production"
echo ""
echo "Next steps:"
echo "1. Push the tag to trigger the GitHub workflow:"
echo "   git push origin v2025.10.07"
echo ""
echo "2. The workflow will automatically:"
echo "   - Generate and attach all artifacts to the GitHub Release"
echo "   - Verify artifact integrity"
echo "   - Ensure reproducibility and provenance"
echo ""
echo "3. Monitor the release in GitHub Actions:"
echo "   https://github.com/BrianCLong/summit/actions"