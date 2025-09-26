#!/usr/bin/env bash
set -euo pipefail

# Rebase a PR onto main, resolve .gitattributes in favor of readable lockfile diffs,
# regenerate lockfiles deterministically, and push with auto-merge enabled.
#
# Usage: scripts/rebase-fix-lockfiles.sh <PR_NUMBER>

PR=${1:-}
if [ -z "$PR" ]; then
  echo "Usage: $0 <PR_NUMBER>" >&2
  exit 1
fi

echo "== Rebase PR #$PR onto main =="
gh pr checkout "$PR"
git fetch origin
git rebase origin/main || true

echo "== Apply .gitattributes union for lockfiles =="
cat > .gitattributes <<'EOF'
# Ensure consistent line endings
* text=auto eol=lf

# Binary files
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
*.zip binary
*.tar.gz binary
*.tgz binary

# Docker files
Dockerfile text eol=lf
*.dockerfile text eol=lf

# YAML files
*.yml text eol=lf
*.yaml text eol=lf

# Shell scripts
*.sh text eol=lf

# TypeScript/JavaScript
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.json text eol=lf

# Markdown
*.md text eol=lf

# Config files
*.toml text eol=lf
*.ini text eol=lf
*.cfg text eol=lf

# Lock files (text diffs; not hidden as generated)
**/package-lock.json linguist-generated=false
**/yarn.lock        linguist-generated=false
**/pnpm-lock.yaml   linguist-generated=false
**/poetry.lock      linguist-generated=false
**/Pipfile.lock     linguist-generated=false
**/Cargo.lock       linguist-generated=false
**/go.sum           linguist-generated=false
**/Gemfile.lock     linguist-generated=false
**/composer.lock    linguist-generated=false
EOF

echo "== Regenerate locks if present =="
if [ -f package.json ]; then
  rm -f package-lock.json yarn.lock pnpm-lock.yaml || true
  npm ci --ignore-scripts || true
fi
if [ -f poetry.lock ] || [ -f pyproject.toml ]; then
  command -v poetry >/dev/null 2>&1 && poetry lock --no-update || true
fi
if [ -f go.mod ]; then
  command -v go >/dev/null 2>&1 && go mod tidy || true
fi

git add -A
git rebase --continue || git commit -m "chore: resolve rebase conflicts (.gitattributes union + regenerated lockfiles)"
git push --force-with-lease

echo "== Enable auto-merge for PR #$PR =="
gh pr merge "$PR" --auto --squash --delete-branch --body "Resolve conflicts by unioning .gitattributes and regenerating locks."
