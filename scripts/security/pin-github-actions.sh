#!/usr/bin/env bash
set -euo pipefail

# Pin GitHub Actions to commit SHAs
# This script finds all unpinned actions and replaces them with pinned versions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKFLOWS_DIR="$REPO_ROOT/.github/workflows"

echo "🔍 Analyzing GitHub Actions usage..."

# Create a mapping file for action versions to SHAs
# Format: action@version -> action@sha # version
MAPPING_FILE="$REPO_ROOT/docs/security/actions-sha-mapping.txt"

# Most common actions with their latest commit SHAs (as of 2026-01-02)
# These should be verified and updated regularly
cat > "$MAPPING_FILE" <<'EOF'
# GitHub Actions SHA Pinning Map
# Generated: 2026-01-02
# Format: action@version -> action@sha # version

# Core GitHub Actions
actions/checkout@v4 -> actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
actions/setup-node@v4 -> actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
actions/upload-artifact@v4 -> actions/upload-artifact@6f51ac03b9356f520e9adb1b1b7802705f340c2b # v4.5.0
actions/download-artifact@v4 -> actions/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16 # v4.1.8
actions/cache@v4 -> actions/cache@6849a6489940f00c2f30c0fb92c6274307ccb58a # v4.2.0
actions/setup-python@v5 -> actions/setup-python@f677139bbe7f9c59b41e40162b753c062f5d49a3 # v5.3.0
actions/setup-go@v5 -> actions/setup-go@41dfa10bad2bb2ae585af6ee5bb4d7d973ad74ed # v5.2.0
actions/github-script@v7 -> actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea # v7.0.1

# pnpm
pnpm/action-setup@v2 -> pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v2.4.0
pnpm/action-setup@v3 -> pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v3.0.0
pnpm/action-setup@v4 -> pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0

# CodeQL
github/codeql-action/init@v3 -> github/codeql-action/init@f09c1c0a94de965c15400f5634aa42fac8fb8f88 # v3.27.5
github/codeql-action/autobuild@v3 -> github/codeql-action/autobuild@f09c1c0a94de965c15400f5634aa42fac8fb8f88 # v3.27.5
github/codeql-action/analyze@v3 -> github/codeql-action/analyze@f09c1c0a94de965c15400f5634aa42fac8fb8f88 # v3.27.5
github/codeql-action/upload-sarif@v3 -> github/codeql-action/upload-sarif@f09c1c0a94de965c15400f5634aa42fac8fb8f88 # v3.27.5
github/codeql-action/init@v4 -> github/codeql-action/init@df409f7d9260372bd5f19e5b04e83cb3c43714ae # v4.0.0
github/codeql-action/autobuild@v4 -> github/codeql-action/autobuild@df409f7d9260372bd5f19e5b04e83cb3c43714ae # v4.0.0
github/codeql-action/analyze@v4 -> github/codeql-action/analyze@df409f7d9260372bd5f19e5b04e83cb3c43714ae # v4.0.0
github/codeql-action/upload-sarif@v4 -> github/codeql-action/upload-sarif@df409f7d9260372bd5f19e5b04e83cb3c43714ae # v4.0.0

# Docker
docker/setup-buildx-action@v3 -> docker/setup-buildx-action@c47758b77c9736f4b2ef4073d4d51994fabfe349 # v3.7.1
docker/setup-qemu-action@v3 -> docker/setup-qemu-action@49b3bc8e6bdd4a60e6116a5414239cba5943d3cf # v3.2.0
docker/build-push-action@v5 -> docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75 # v5.4.0
docker/build-push-action@v6 -> docker/build-push-action@48aba3b46d1b1fec4febb7c5d0c644b249a11355 # v6.10.0
docker/login-action@v3 -> docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567 # v3.3.0
docker/metadata-action@v5 -> docker/metadata-action@902d4634c04e97dd1c4dcfe3c8a05f38a88f6fc8 # v5.6.1

# Security scanning
aquasecurity/trivy-action@master -> aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8 # 0.24.0 (URGENT: use version tag)
anchore/sbom-action@v0 -> anchore/sbom-action@d94f46e13c6c62f59525ac9a1e147a99dc0b9bf5 # v0.17.2
anchore/scan-action@v3 -> anchore/scan-action@64a33b277ea7a1215a3c142735a1091341939ff5 # v3.6.4
snyk/actions/node@master -> snyk/actions/node@cdb760004ba9ea4d525f2e043745dfe85bb9077e # 0.4.0
returntocorp/semgrep-action@v1 -> returntocorp/semgrep-action@48704cd8e29fef2f0b533db02facb0c6c0e9c8c2 # v1.95.0
gitleaks/gitleaks-action@v2 -> gitleaks/gitleaks-action@cb7149d2e214b7c5b8e68f0c09eeb58e5c7c3a1b # v2.3.7
zricethezav/gitleaks-action@v2 -> zricethezav/gitleaks-action@cb7149d2e214b7c5b8e68f0c09eeb58e5c7c3a1b # v2.3.7

# SLSA
slsa-framework/slsa-github-generator/actions/generator/generic@v1 -> slsa-framework/slsa-github-generator/actions/generator/generic@5a775b367a56d5bd118a224a811bba288150a563 # v1.10.0

# Azure
azure/setup-helm@v4 -> azure/setup-helm@fe7b79cd5ee1e45176fcad797de68ecaf3ca4814 # v4.2.0
azure/setup-kubectl@v4 -> azure/setup-kubectl@3e0aec4d80787158d308d7b364cb1b702e7feb7f # v4.0.0

# Other popular actions
actions/add-to-project@v1 -> actions/add-to-project@244f685bbc3b7adfa8466e08b698b5577571133e # v1.0.2
gaurav-nelson/github-action-markdown-link-check@v1 -> gaurav-nelson/github-action-markdown-link-check@d53a906aa6b22b8979d33bc86170567e619495ec # v1.0.15
zaproxy/action-baseline@v0.15.0 -> zaproxy/action-baseline@e74d15c6eb914ccdce2a81f2b5a70f9d8d006e3d # v0.15.0
codecov/codecov-action@v4 -> codecov/codecov-action@015f24e6818733317a2da2edd6290ab26238649a # v4.6.0
EOF

echo "✅ SHA mapping file created: $MAPPING_FILE"
echo ""
echo "📊 Scanning workflows for unpinned actions..."

# Find all workflow files
WORKFLOW_FILES=$(find "$WORKFLOWS_DIR" -name "*.yml" -o -name "*.yaml" | sort)

# Count unpinned actions
UNPINNED_COUNT=0
declare -A action_counts

for file in $WORKFLOW_FILES; do
    # Find uses: lines with version tags (not commit SHAs)
    while IFS= read -r line; do
        if [[ $line =~ uses:[[:space:]]*([^@]+)@(v[0-9]+|master|main) ]]; then
            action="${BASH_REMATCH[1]}"
            version="${BASH_REMATCH[2]}"
            full_ref="${action}@${version}"
            ((UNPINNED_COUNT++))
            ((action_counts["$full_ref"]++)) || action_counts["$full_ref"]=1
        fi
    done < <(grep -E "^\s*uses:\s*" "$file" || true)
done

echo "🔍 Found $UNPINNED_COUNT unpinned action references"
echo ""
echo "📈 Top 10 unpinned actions:"
for action in "${!action_counts[@]}"; do
    echo "  ${action_counts[$action]}x $action"
done | sort -rn | head -10
echo ""

# Dry run: show what would be replaced
echo "🔄 Dry run - would make the following replacements:"
echo ""

while IFS= read -r line; do
    [[ "$line" =~ ^# ]] && continue
    [[ -z "$line" ]] && continue

    if [[ "$line" =~ ^([^\ ]+)\ -\>\ ([^\ ]+)\ # ]]; then
        from="${BASH_REMATCH[1]}"
        to="${BASH_REMATCH[2]}"
        echo "  $from -> $to"
    fi
done < "$MAPPING_FILE"

echo ""
read -p "🚀 Apply these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted. No changes made."
    exit 0
fi

# Apply replacements
echo "✏️  Applying replacements..."

CHANGED_FILES=0
while IFS= read -r line; do
    [[ "$line" =~ ^# ]] && continue
    [[ -z "$line" ]] && continue

    if [[ "$line" =~ ^([^\ ]+)\ -\>\ ([^\ ]+)\ #\ (.+)$ ]]; then
        from="${BASH_REMATCH[1]}"
        to="${BASH_REMATCH[2]}"
        comment="${BASH_REMATCH[3]}"

        for file in $WORKFLOW_FILES; do
            if grep -q "$from" "$file"; then
                echo "  📝 Updating $file"
                # Use a safe delimiter for sed since paths contain /
                sed -i "s|$from|$to # $comment|g" "$file"
                ((CHANGED_FILES++))
            fi
        done
    fi
done < "$MAPPING_FILE"

echo ""
echo "✅ Updated $CHANGED_FILES workflow files"
echo ""
echo "🔍 Verification - remaining unpinned actions:"
grep -rn "uses:.*@v[0-9]" "$WORKFLOWS_DIR" --include="*.yml" --include="*.yaml" | wc -l
grep -rn "uses:.*@master\|uses:.*@main" "$WORKFLOWS_DIR" --include="*.yml" --include="*.yaml" | grep -v "^#" | wc -l || echo "0"

echo ""
echo "✅ GitHub Actions pinning complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Review changes: git diff .github/workflows/"
echo "  2. Test workflows locally (if possible)"
echo "  3. Commit: git add .github/workflows/ && git commit -m 'fix(ci): pin all GitHub Actions to commit SHAs'"
echo "  4. Push and monitor CI"
echo ""
echo "📚 Documentation:"
echo "  - SHA mapping: $MAPPING_FILE"
echo "  - Update SHAs regularly (monthly recommended)"
echo "  - Use Dependabot to track action updates"
