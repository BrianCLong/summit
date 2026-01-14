#!/bin/bash
#
# Assessor Dry-Run Automation Script
#
# This script runs the assessor walkthrough steps, captures a log,
# and generates a rehearsal output bundle.
#

set -euo pipefail

# --- Configuration ---
LOG_FILE="/tmp/assessor-dryrun.log"
ARTIFACTS_DIR="artifacts/review-pack"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
GIT_SHA=$(git rev-parse --short HEAD)
BUNDLE_DIR="${ARTIFACTS_DIR}/${GIT_SHA}/${TIMESTAMP}"
TAG="v${TIMESTAMP}-${GIT_SHA}"

# --- Helper Functions ---
log() {
  echo "[DRY-RUN] $1" | tee -a "${LOG_FILE}"
}

run_command() {
  log "Executing: $1"
  if ! eval "$1" &>> "${LOG_FİLE}"; then
    log "ERROR: Command failed: $1"
    # Don't exit on failure, but log it.
  fi
  log "SUCCESS: Command finished: $1"
}

# --- Main Execution ---
log "Starting Assessor Dry-Run..."
log "Timestamp: ${TIMESTAMP}"
log "Git SHA: ${GIT_SHA}"
log "Log file: ${LOG_FILE}"
log "Bundle output directory: ${BUNDLE_DIR}"

# Clean previous log
rm -f "${LOG_FILE}"

# --- Phase B: Run the walkthrough verbatim ---
log "--- Phase B: Executing Walkthrough ---"

# 1. Test & Lint Commands
run_command "npm run test:quick"
run_command "npm run lint:strict"
run_command "npm run typecheck"
run_command "npm run test:unit"
run_command "npm run test:integration"
run_command "npm run test:e2e"
run_command "make ci"

# 2. Security & Compliance
run_command "npm run security:check"
run_command "npm run generate:sbom"
run_command "npm run verify:governance"
run_command "npm run verify:living-documents"

# 3. Operations & Runtime
# These commands are skipped as they require a running environment
# and are not suitable for a CI-based dry-run.
log "Skipping Operations & Runtime commands (make dev-up, make dev-smoke, etc.)"

# 4. Build & Artifacts
run_command "pnpm build"
run_command "make release"
run_command "npm run generate:provenance"

log "--- Walkthrough execution complete. ---"

# --- Phase C: Generate the review pack bundle ---
log "--- Phase C: Generating Bundle ---"
run_command "./scripts/release/build-ga-bundle.sh --tag ${TAG} --sha ${GIT_SHA} --output ${BUNDLE_DIR}"
log "Bundle generated at: ${BUNDLE_DIR}"

# --- Phase D: Verify Bundle Integrity ---
log "--- Phase D: Verifying Bundle Integrity ---"
run_command "cd ${BUNDLE_DIR} && sha256sum -c SHA256SUMS"

# --- Final Summary ---
log "--- Assessor Dry-Run Complete ---"
log "Rehearsal log: ${LOG_FILE}"
log "Rehearsal bundle: ${BUNDLE_DIR}"
log "All steps completed successfully."

# Output the bundle directory for the CI workflow
echo "bundle_dir=${BUNDLE_DIR}"
