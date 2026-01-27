#!/bin/bash
# scripts/version-check.sh - Verify version consistency across all configuration files
# Used by CI to detect version drift before it causes issues
#
# Usage: ./scripts/version-check.sh [--fix]
#
# Exit codes:
#   0 - All versions are consistent
#   1 - Version drift detected (--fix will attempt to repair)

set -euo pipefail

FIX_MODE=${1:-""}
ERRORS=0

echo "=== Version Consistency Check ==="
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Read canonical versions
# ═══════════════════════════════════════════════════════════════════════════

# Node.js canonical version from .nvmrc
CANONICAL_NODE=$(cat .nvmrc 2>/dev/null | tr -d 'v' | tr -d '\n')
echo "Canonical Node.js version (.nvmrc): $CANONICAL_NODE"

# pnpm canonical version from package.json
CANONICAL_PNPM=$(jq -r '.packageManager // empty' package.json 2>/dev/null | sed 's/pnpm@//')
echo "Canonical pnpm version (package.json): $CANONICAL_PNPM"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check .node-version
# ═══════════════════════════════════════════════════════════════════════════
check_node_version() {
    if [ -f ".node-version" ]; then
        ACTUAL=$(cat .node-version | tr -d 'v' | tr -d '\n')
        if [ "$ACTUAL" != "$CANONICAL_NODE" ]; then
            echo "❌ .node-version: $ACTUAL (expected: $CANONICAL_NODE)"
            ((ERRORS++))
            if [ "$FIX_MODE" == "--fix" ]; then
                echo "$CANONICAL_NODE" > .node-version
                echo "   Fixed: Updated .node-version to $CANONICAL_NODE"
            fi
        else
            echo "✅ .node-version: $ACTUAL"
        fi
    else
        echo "ℹ️  .node-version: not present"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Check .tool-versions (asdf)
# ═══════════════════════════════════════════════════════════════════════════
check_tool_versions() {
    if [ -f ".tool-versions" ]; then
        # Check Node.js
        TOOL_NODE=$(grep "^nodejs" .tool-versions 2>/dev/null | awk '{print $2}' | tr -d '\n')
        if [ -n "$TOOL_NODE" ] && [ "$TOOL_NODE" != "$CANONICAL_NODE" ]; then
            echo "❌ .tool-versions (nodejs): $TOOL_NODE (expected: $CANONICAL_NODE)"
            ((ERRORS++))
            if [ "$FIX_MODE" == "--fix" ]; then
                sed -i.bak "s/^nodejs.*/nodejs $CANONICAL_NODE/" .tool-versions
                rm -f .tool-versions.bak
                echo "   Fixed: Updated nodejs in .tool-versions"
            fi
        else
            echo "✅ .tool-versions (nodejs): $TOOL_NODE"
        fi

        # Check pnpm
        TOOL_PNPM=$(grep "^pnpm" .tool-versions 2>/dev/null | awk '{print $2}' | tr -d '\n')
        if [ -n "$TOOL_PNPM" ] && [ "$TOOL_PNPM" != "$CANONICAL_PNPM" ]; then
            echo "❌ .tool-versions (pnpm): $TOOL_PNPM (expected: $CANONICAL_PNPM)"
            ((ERRORS++))
            if [ "$FIX_MODE" == "--fix" ]; then
                sed -i.bak "s/^pnpm.*/pnpm $CANONICAL_PNPM/" .tool-versions
                rm -f .tool-versions.bak
                echo "   Fixed: Updated pnpm in .tool-versions"
            fi
        else
            echo "✅ .tool-versions (pnpm): $TOOL_PNPM"
        fi
    else
        echo "ℹ️  .tool-versions: not present"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Check nested .nvmrc files
# ═══════════════════════════════════════════════════════════════════════════
check_nested_nvmrc() {
    echo ""
    echo "Checking nested .nvmrc files..."

    while IFS= read -r nvmrc; do
        if [ "$nvmrc" != ".nvmrc" ] && [ -f "$nvmrc" ]; then
            NESTED=$(cat "$nvmrc" | tr -d 'v' | tr -d '\n')

            # Allow major version matching (e.g., "20" matches "20.19.0")
            CANONICAL_MAJOR=$(echo "$CANONICAL_NODE" | cut -d. -f1)
            NESTED_MAJOR=$(echo "$NESTED" | cut -d. -f1)

            if [ "$NESTED" != "$CANONICAL_NODE" ] && [ "$NESTED_MAJOR" != "$CANONICAL_MAJOR" ]; then
                echo "❌ $nvmrc: $NESTED (expected: $CANONICAL_NODE or major $CANONICAL_MAJOR)"
                ((ERRORS++))
                if [ "$FIX_MODE" == "--fix" ]; then
                    echo "$CANONICAL_NODE" > "$nvmrc"
                    echo "   Fixed: Updated $nvmrc"
                fi
            elif [ "$NESTED" != "$CANONICAL_NODE" ]; then
                echo "⚠️  $nvmrc: $NESTED (major version matches, consider updating to $CANONICAL_NODE)"
            else
                echo "✅ $nvmrc: $NESTED"
            fi
        fi
    done < <(find . -name '.nvmrc' -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null)
}

# ═══════════════════════════════════════════════════════════════════════════
# Check package.json engines
# ═══════════════════════════════════════════════════════════════════════════
check_package_engines() {
    echo ""
    echo "Checking package.json engines..."

    ENGINE_NODE=$(jq -r '.engines.node // empty' package.json 2>/dev/null)
    if [ -n "$ENGINE_NODE" ]; then
        echo "ℹ️  package.json engines.node: $ENGINE_NODE (range specification, not exact)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
print_summary() {
    echo ""
    echo "=== Summary ==="

    if [ $ERRORS -eq 0 ]; then
        echo "✅ All version specifications are consistent"
        exit 0
    else
        echo "❌ Found $ERRORS version inconsistency(ies)"
        if [ "$FIX_MODE" == "--fix" ]; then
            echo "   Fixes have been applied. Please review and commit the changes."
        else
            echo "   Run with --fix to automatically correct: ./scripts/version-check.sh --fix"
        fi
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════
main() {
    check_node_version
    check_tool_versions
    check_nested_nvmrc
    check_package_engines
    print_summary
}

main "$@"
