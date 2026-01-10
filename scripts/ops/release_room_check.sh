#!/bin/bash
set -u

# Print header
echo "Release Room Check"
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "Commit: $(git rev-parse HEAD)"
echo "Time: $(date)"
echo "---------------------------------------------------"

run_check() {
    local desc="$1"
    local cmd="$2"

    echo "Running: $desc"

    # Attempt to run the command
    # We use 'eval' to handle arguments correctly if needed, but direct execution is safer.
    # However, input commands have spaces (args).

    if $cmd; then
        echo "PASS"
    else
        local exit_code=$?
        echo "FAIL: $desc"
        echo "Command: $cmd"
        echo "Remediation: Ensure the script exists and passes. Check logs for details."
        exit 1
    fi
    echo "---------------------------------------------------"
}

# 1. Repo hygiene gate
run_check "Repo Hygiene Gate" "bash scripts/ci/check_repo_hygiene.sh"

# 2. Evidence map verifier
run_check "Evidence Map Verifier" "node scripts/ci/verify_evidence_map.mjs"

# 3. Security ledger verifier (hard)
run_check "Security Ledger Verifier (hard)" "node scripts/ci/verify_security_ledger.mjs --mode=hard"

# 4. Logging safety checker
run_check "Logging Safety Checker" "node scripts/ci/check_logging_safety.mjs"

# 5. Trust dashboard (hard)
run_check "Trust Dashboard (hard)" "node scripts/ops/generate_trust_dashboard.mjs --mode=hard"

# 6. Release bundle verifier (hard)
# User input: "scripts/ops/verify_release_bundle.mjs --mode=hard (if present)"
# We check if the file exists before running, to respect "(if present)".
if [ -f "scripts/ops/verify_release_bundle.mjs" ]; then
    run_check "Release Bundle Verifier (hard)" "node scripts/ops/verify_release_bundle.mjs --mode=hard"
else
    echo "Skipping: Release Bundle Verifier (hard) - Script not found (optional)"
    echo "---------------------------------------------------"
fi

echo "All checks PASS"
exit 0
