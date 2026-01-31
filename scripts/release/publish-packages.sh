#!/usr/bin/env bash
# Publish Summit packages to npm
# Usage: ./scripts/release/publish-packages.sh [--dry-run]
#
# Prerequisites:
#   npm login (or NPM_TOKEN environment variable)
#
# Publishes:
#   - @maestro/core
#   - @intelgraph/maestro
#   - intelgraph-server

set -euo pipefail

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "=== DRY RUN MODE ==="
fi

# Check npm auth
if ! npm whoami &>/dev/null; then
  echo "ERROR: Not authenticated to npm"
  echo "Run 'npm login' or set NPM_TOKEN environment variable"
  exit 1
fi

echo "Authenticated as: $(npm whoami)"
echo ""

# Packages to publish (non-private packages with dist directories)
PACKAGES=(
  "packages/maestro-core"
  "packages/maestro-cli"
  "server"
)

# Build packages first
echo "=== Building packages ==="
for pkg in "${PACKAGES[@]}"; do
  echo "Building $pkg..."
  pnpm --filter "$(jq -r '.name' "$pkg/package.json")" build
done
echo ""

# Publish packages
echo "=== Publishing packages ==="
for pkg in "${PACKAGES[@]}"; do
  name=$(jq -r '.name' "$pkg/package.json")
  version=$(jq -r '.version' "$pkg/package.json")
  private=$(jq -r '.private // false' "$pkg/package.json")

  if [[ "$private" == "true" ]]; then
    echo "SKIP: $name@$version (private)"
    continue
  fi

  if [[ ! -d "$pkg/dist" ]]; then
    echo "SKIP: $name@$version (no dist directory)"
    continue
  fi

  echo "Publishing: $name@$version"
  cd "$pkg"
  npm publish --access public $DRY_RUN || echo "WARN: Failed to publish $name"
  cd - > /dev/null
  echo ""
done

echo "=== Done ==="
