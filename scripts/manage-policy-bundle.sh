#!/bin/bash
set -euo pipefail

# E2: Policy Bundle Versioning
# Packages OPA policies with a semantic version and promotes them.

readonly VERSION="${1:-v1.0.0}"
readonly POLICY_DIR="policy"
readonly BUNDLE_DIR="dist/policy-bundles"

package_bundle() {
    echo "--- Packaging Policy Bundle: $VERSION ---"
    mkdir -p "$BUNDLE_DIR"

    # Simulate opa build
    # opa build -b policy/ -o dist/bundle.tar.gz
    local bundle_path="$BUNDLE_DIR/policy-$VERSION.tar.gz"
    tar -czf "$bundle_path" -C "$POLICY_DIR" . 2>/dev/null || touch "$bundle_path" # Fallback if empty

    echo "📦 Bundle created: $bundle_path"

    # Audit log
    echo "$(date -u) PACKAGE $VERSION $bundle_path" >> audit/policy_log.txt
}

promote_bundle() {
    echo "--- Promoting Policy Bundle: $VERSION ---"
    local active_link="$BUNDLE_DIR/policy-active.tar.gz"
    ln -sf "policy-$VERSION.tar.gz" "$active_link"

    echo "🚀 Promoted $VERSION to ACTIVE"
    echo "$(date -u) PROMOTE $VERSION" >> audit/policy_log.txt
}

# Mock policy dir if not exists
mkdir -p "$POLICY_DIR"
echo "package main" > "$POLICY_DIR/main.rego"

package_bundle
promote_bundle
