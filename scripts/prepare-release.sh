#!/bin/bash

# Prepare Release Script
# Called by semantic-release before creating a release

set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Error: Version argument required"
  exit 1
fi

echo "📦 Preparing release v${VERSION}..."

# Update package.json versions in monorepo
echo "Updating package versions..."
find . -name "package.json" -not -path "*/node_modules/*" -exec \
  node -e "
    const fs = require('fs');
    const file = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.version = '${VERSION}';
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  " {} \;

# Create release notes template
echo "Creating release notes..."
cat > RELEASE_NOTES.md << EOF
# Release v${VERSION}

## What's Changed

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.

## Installation

\`\`\`bash
docker pull ghcr.io/brianelong/summit/api:${VERSION}
docker pull ghcr.io/brianelong/summit/web:${VERSION}
\`\`\`

## Deployment

\`\`\`bash
# Deploy to staging
gh workflow run deploy-staging.yml -f version=${VERSION}

# Deploy to production (requires approval)
gh workflow run deploy-production.yml -f version=${VERSION}
\`\`\`

## Verification

\`\`\`bash
# Check version
curl https://intelgraph.io/api/version
# Should return: {"version": "${VERSION}"}
\`\`\`

EOF

echo "✅ Release v${VERSION} prepared successfully"
