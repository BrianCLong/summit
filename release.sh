#!/bin/bash
set -e

# 1. Get the new version number
if [ -z "$1" ]; then
  echo "Usage: ./release.sh <version>"
  exit 1
fi
VERSION=$1

# 2. Update CHANGELOG.md (simple version)
echo "## [$VERSION] - $(date +%Y-%m-%d)" > release_notes.tmp
# (In a real scenario, you would gather commit messages since the last tag)
git log --pretty=format:"- %s" $(git describe --tags --abbrev=0)..HEAD >> release_notes.tmp
echo "" >> release_notes.tmp
cat CHANGELOG.md >> release_notes.tmp
mv release_notes.tmp CHANGELOG.md

# 3. Commit the changelog
git add CHANGELOG.md
git commit -m "docs: update changelog for v$VERSION"

# 4. Tag the release
git tag -a "v$VERSION" -m "Release v$VERSION"

# 5. Push to remote
git push origin main --follow-tags

echo "Release v$VERSION created and pushed successfully."
