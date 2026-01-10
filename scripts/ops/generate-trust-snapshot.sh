#!/bin/bash

# generate-trust-snapshot.sh
# Generates a JSON snapshot of the current Trust Metrics.
# Usage: ./generate-trust-snapshot.sh [--json]

set -e

JSON_OUTPUT=false
if [[ "$1" == "--json" ]]; then
    JSON_OUTPUT=true
fi

# Initialize metrics
CI_STABILITY="Unknown"
SECURITY_HYGIENE="Unknown"
GOVERNANCE_INTEGRITY="Fail"
EVIDENCE_FRESHNESS="Fail"
REPO_HYGIENE="Unknown"

# 1. CI Stability (Flake Rate)
# Note: Requires 'gh' CLI authenticated.
if command -v gh &> /dev/null; then
    # Fetch last 20 runs of ci.yml
    if CI_DATA=$(gh run list --workflow ci.yml --limit 20 --json conclusion 2>/dev/null); then
        TOTAL_RUNS=$(echo "$CI_DATA" | jq length)
        SUCCESS_RUNS=$(echo "$CI_DATA" | jq '[.[] | select(.conclusion=="success")] | length')
        if [ "$TOTAL_RUNS" -gt 0 ]; then
            CI_STABILITY=$(awk "BEGIN {printf \"%.0f\", ($SUCCESS_RUNS/$TOTAL_RUNS)*100}")
        else
            CI_STABILITY="No Data"
        fi
    fi
fi

# 2. Security Hygiene (High Vulnerabilities)
if command -v pnpm &> /dev/null; then
    # We use || true because pnpm audit returns non-zero on found vulns
    AUDIT_JSON=$(pnpm audit --audit-level=high --json 2>/dev/null || true)
    # Check if we got valid JSON output
    if echo "$AUDIT_JSON" | jq . >/dev/null 2>&1; then
        HIGH_VULNS=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.high // 0')
        SECURITY_HYGIENE=$HIGH_VULNS
    fi
fi

# 3. Governance Integrity
if [ -f "scripts/check-governance.cjs" ]; then
    if node scripts/check-governance.cjs > /dev/null 2>&1; then
        GOVERNANCE_INTEGRITY="Pass"
    else
        GOVERNANCE_INTEGRITY="Fail"
    fi
else
    GOVERNANCE_INTEGRITY="Script Missing"
fi

# 4. Evidence Freshness (Last 7 days)
if [ -f "docs/ops/EVIDENCE_INDEX.json" ]; then
    # Check modification time of the index file itself as a proxy for activity
    if find docs/ops/EVIDENCE_INDEX.json -mtime -7 | grep -q .; then
        EVIDENCE_FRESHNESS="Pass"
    else
        EVIDENCE_FRESHNESS="Fail (>7 days old)"
    fi
else
    EVIDENCE_FRESHNESS="Missing Index"
fi

# 5. Repo Hygiene (Untracked Files)
UNTRACKED_COUNT=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
REPO_HYGIENE=$UNTRACKED_COUNT

# Output
if [ "$JSON_OUTPUT" = true ]; then
    cat <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "metrics": {
    "ci_stability_percent": "$CI_STABILITY",
    "security_high_vulns": "$SECURITY_HYGIENE",
    "governance_integrity": "$GOVERNANCE_INTEGRITY",
    "evidence_freshness": "$EVIDENCE_FRESHNESS",
    "repo_untracked_files": $REPO_HYGIENE
  }
}
EOF
else
    echo "=== Trust Metric Snapshot ==="
    echo "Generated: $(date)"
    echo ""
    echo "1. CI Stability:        $CI_STABILITY% (Target: >95%)"
    echo "2. Security Hygiene:    $SECURITY_HYGIENE High Vulns (Target: 0)"
    echo "3. Governance:          $GOVERNANCE_INTEGRITY (Target: Pass)"
    echo "4. Evidence Freshness:  $EVIDENCE_FRESHNESS (Target: Pass)"
    echo "5. Repo Hygiene:        $REPO_HYGIENE Untracked Files (Target: 0)"
    echo ""

    # Determine Status
    STATUS="GREEN"
    if [ "$GOVERNANCE_INTEGRITY" != "Pass" ] || [ "$REPO_HYGIENE" -gt 0 ]; then
        STATUS="RED"
    elif [ "$SECURITY_HYGIENE" != "0" ] && [ "$SECURITY_HYGIENE" != "Unknown" ]; then
        STATUS="RED"
    fi
    echo "Overall Status: $STATUS"
fi
