#!/bin/bash
set -e

# GA Lock Guard for Release Scripts
# This script is sourced by other release scripts to enforce GA lockdown.

# 1. Check for GA_LOCKED environment variable
if [ "$GA_LOCKED" == "true" ]; then
    echo "🔒 GA LOCK ACTIVE: Release operations are restricted."

    # 2. Check for CI environment
    if [ -z "$CI" ]; then
        echo "❌ ERROR: Manual releases are FORBIDDEN during GA Lock."
        echo "   Releases must be triggered via CI/CD pipelines."
        exit 1
    fi

    # 3. Check for Dirty Working Directory
    if [ -n "$(git status --porcelain)" ]; then
        echo "❌ ERROR: Working directory is dirty."
        echo "   GA releases requires a clean git state."
        exit 1
    fi

    echo "✅ GA Lock checks passed. Proceeding with CI-driven release."
else
    echo "⚠️  GA Lock NOT active. Proceeding with caution."
fi
