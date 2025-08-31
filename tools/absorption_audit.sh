#!/usr/bin/env bash
set -euo pipefail
REPO="${1:-BrianCLong/summit}"

echo "🔍 ABSORPTION AUDIT - Verifying Zero Work Loss"
echo "=============================================="

# 1) verify archive tags exist
echo "== Archive Tags Verification =="
git fetch --tags --force
ARCH_CNT=$(git tag -l "archive/*" | wc -l | tr -d ' ')
echo "archive/* tags found: $ARCH_CNT"
git tag -l "archive/*" | head -10
echo ""

# 2) list closed PR heads and check reachability from main
echo "== Closed PR Absorption Check =="
MAIN_SHA=$(git rev-parse origin/main)
echo "Main branch SHA: $MAIN_SHA"

# Check if gh is available
if command -v gh > /dev/null; then
    echo "Checking closed PRs absorption..."
    gh pr list -R "$REPO" --state closed --limit 20 --json number,headRefName,mergeCommit,headRefOid \
    | jq -r ".[] | [.number,.headRefName,.headRefOid] | @tsv" \
    | while IFS=$'\t' read -r NUM BR SHA; do
        if [ -n "$SHA" ] && git cat-file -e "$SHA" 2>/dev/null; then
            if git merge-base --is-ancestor "$SHA" "$MAIN_SHA" 2>/dev/null; then
                echo "PR #$NUM ($BR): ✅ absorbed"
            else
                echo "PR #$NUM ($BR): ❌ NOT absorbed -> $SHA"
            fi
        else
            echo "PR #$NUM ($BR): ⚠️  SHA not available locally"
        fi
    done
else
    echo "⚠️  gh CLI not available - skipping PR check"
fi

echo ""

# 3) orphan branches: commits ahead of main
echo "== Remote Branch Status =="
git ls-remote --heads origin | awk '{print $2}' | sed 's#refs/heads/##' \
| head -15 | while read BR; do
    if [ "$BR" != "main" ]; then
        # Fetch branch safely
        if git fetch origin "$BR":"refs/tmp/$BR" >/dev/null 2>&1; then
            AHEAD=$(git rev-list --left-right --count "refs/tmp/$BR...origin/main" 2>/dev/null | awk '{print $1}' || echo "0")
            if [ "$AHEAD" != "0" ]; then
                echo "branch $BR: ❌ $AHEAD commits ahead of main"
            else
                echo "branch $BR: ✅ absorbed or up-to-date"
            fi
            git update-ref -d "refs/tmp/$BR" 2>/dev/null || true
        else
            echo "branch $BR: ⚠️  failed to fetch"
        fi
    fi
done

echo ""
echo "🎯 AUDIT COMPLETE - Check results above"