#!/usr/bin/env bash
set -euo pipefail
PKG_DIR="${1:-_pkg}"
BRANCH="${BRANCH:-docs/refresh-2025-08-13}"

echo "Copying docs from $PKG_DIR"
mkdir -p docs/generated .github/ISSUE_TEMPLATE migrations/postgres migrations/neo4j seeds/postgres seeds/neo4j tools issues
rsync -a "$PKG_DIR/docs/" docs/ || true
rsync -a "$PKG_DIR/.github/" .github/ || true
rsync -a "$PKG_DIR/migrations/" migrations/ || true
rsync -a "$PKG_DIR/seeds/" seeds/ || true
rsync -a "$PKG_DIR/tools/" tools/ || true
rsync -a "$PKG_DIR/issues/" issues/ || true
cp "$PKG_DIR/README.md" "$PKG_DIR/CHANGELOG.md" "$PKG_DIR/UPLOAD_TO_GITHUB.md" .

git add .
git commit -m "docs: refresh + CI + issues tooling + seeds/migrations (bundle)"
git push -u origin "$BRANCH" || true

if command -v gh >/dev/null 2>&1; then
  gh pr create --fill --base main --head "$BRANCH" --title "docs: refresh 2025-08-13" --body "Docs bundle + CI + issues tooling + seeds & migrations"
else
  echo "Install GitHub CLI (gh) to auto-open PR."
fi
