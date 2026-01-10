#!/usr/bin/env bash
set -e

# Release Execution Plan for MVP 4 GA (v4.2.0)
# To be executed by a maintainer with push permissions.

echo "🚀 Starting Release Execution Plan for v4.2.0..."

# 1. Checkout main and update
git checkout main
git pull origin main

# 2. Create Release Branch
echo "🌿 Creating Release Branch: release/4.2"
node scripts/release/cut-release-branch.mjs --from HEAD --series 4.2

# 3. Checkout Branch
git checkout release/4.2

# 4. Apply Version Bump (Maintainer needs to apply the patch provided or run these commands)
echo "📦 Bumping Version to 4.2.0"
npm version 4.2.0 --no-git-tag-version

# 5. Update CHANGELOG (Prepend new entry)
echo "📝 Updating CHANGELOG.md"
cat <<EOF > CHANGELOG_ENTRY.tmp
## [4.2.0] - $(date +%Y-%m-%d)

### Added
- MVP 4 GA Release
- Hardened Supply Chain Security
- Deterministic Build Verification

EOF

# Prepend only if not already present (simple check)
if ! grep -q "## \[4.2.0\]" CHANGELOG.md; then
    # Keep the header lines (first 4 lines usually) if you want to insert after them,
    # but for simplicity here we just prepend to the whole file after the first line or reconstruct.
    # A safer way:
    # 1. Save header
    head -n 4 CHANGELOG.md > CHANGELOG.new
    # 2. Add new entry
    cat CHANGELOG_ENTRY.tmp >> CHANGELOG.new
    # 3. Add rest of old changelog (skipping header)
    tail -n +5 CHANGELOG.md >> CHANGELOG.new
    # 4. Move back
    mv CHANGELOG.new CHANGELOG.md
    rm CHANGELOG_ENTRY.tmp
else
    echo "Entry for 4.2.0 already exists."
    rm CHANGELOG_ENTRY.tmp
fi

git add package.json CHANGELOG.md
git commit -m "chore(release): v4.2.0 [skip ci]"

# 6. Generate Release Bundle (Artifacts)
echo "🔨 Generating Release Bundle..."
npm run release:bundle -- --tag v4.2.0

# 7. Tagging
echo "🏷️  Tagging v4.2.0"
git tag -a v4.2.0 -m "MVP 4 GA Release"

# 8. Push
echo "📤 Pushing Branch and Tag..."
git push origin release/4.2
git push origin v4.2.0

echo "✅ Release Cut Complete!"
echo "Artifacts are in dist/release/"
