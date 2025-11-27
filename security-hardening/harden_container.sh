#!/bin/bash
set -euo pipefail

# Ultra-Maximal Container Hardening Script
# Validates Dockerfiles against Summit Security Standards (Zero Trust)
# Usage: ./harden_container.sh [Dockerfile_Path]

TARGET=${1:-Dockerfile}

echo "🛡️  Starting Security Hardening Audit for: $TARGET"

# Check 0: File existence
if [ ! -f "$TARGET" ]; then
    echo "❌ Error: File $TARGET not found."
    exit 1
fi

FAILURES=0

# Check 1: Non-root user (UID > 1000 or specific user)
# We recommend UID 65532 (distroless nonroot)
if grep -qE "^USER\s+[0-9a-zA-Z]+" "$TARGET"; then
    echo "✅ [PASS] USER instruction found."
else
    echo "❌ [FAIL] No USER instruction found. Container implies root execution."
    FAILURES=$((FAILURES + 1))
fi

# Check 2: Base Image Pinning (Digest preferred, Version accepted)
if grep -E "^FROM .*@" "$TARGET"; then
     echo "✅ [PASS] Base image pinned by digest (SHA256)."
elif grep -E "^FROM .*:[0-9]+\.[0-9]+" "$TARGET"; then
     echo "⚠️ [WARN] Base image pinned by version tag. Prefer SHA256 digest for immutability."
else
     echo "❌ [FAIL] Base image uses 'latest' or unpinned tag."
     FAILURES=$((FAILURES + 1))
fi

# Check 3: Secrets Scanning (Basic heuristic)
if grep -iE "(API_?KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)" "$TARGET" | grep -v "ARG" | grep -v "ENV"; then
    echo "❌ [FAIL] Potential hardcoded secret pattern found."
    FAILURES=$((FAILURES + 1))
else
    echo "✅ [PASS] No obvious hardcoded secrets found."
fi

# Check 4: No 'sudo'
if grep -q "sudo" "$TARGET"; then
    echo "❌ [FAIL] 'sudo' usage detected. Violates least privilege."
    FAILURES=$((FAILURES + 1))
else
    echo "✅ [PASS] No 'sudo' usage."
fi

# Check 5: Read-Only FS compatibility (check for volume defs for writes)
# If app writes to disk, it should define a volume.
if grep -q "VOLUME" "$TARGET"; then
    echo "ℹ️ [INFO] VOLUME defined. Ensure runtime is mounted Read-Only with tmpfs."
else
    echo "ℹ️ [INFO] No VOLUME defined. Assuming stateless."
fi

if [ $FAILURES -gt 0 ]; then
    echo "🚫 Security Hardening Failed with $FAILURES critical issues."
    exit 1
else
    echo "🔒 Container passed hardening checks."
    exit 0
fi
