#!/usr/bin/env bash
set -euo pipefail

# Update root dependencies
npx npm-check-updates -u --target minor
npm install

# Update server dependencies
if [ -d "server" ]; then
  pushd server >/dev/null
  npx npm-check-updates -u --target minor
  npm install
  popd >/dev/null
fi

# Update client dependencies
if [ -d "client" ]; then
  pushd client >/dev/null
  npx npm-check-updates -u --target minor
  npm install
  popd >/dev/null
fi

# Run lint and tests after updates
npm run lint
npm test
