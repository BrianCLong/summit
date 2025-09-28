#!/usr/bin/env bash
set -euo pipefail

VERSION=${1:-"v1.0.0-rc.1"}
echo "Tagging RC ${VERSION}"
git tag -a "${VERSION}" -m "Release Candidate ${VERSION}" || true
echo "Generating changelog (placeholder)"
git log --pretty=format:"* %h %s" -n 100 > CHANGELOG_RC.md
echo "Done. Push tags with: git push --tags"

