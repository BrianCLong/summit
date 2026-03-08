#!/bin/bash
sed -i 's/pnpm install --frozen-lockfile/pnpm install --frozen-lockfile\n          pnpm add -g ts-node typescript/g' .github/workflows/schema-diff.yml
sed -i 's/npm install -g ts-node typescript//g' .github/workflows/schema-diff.yml
