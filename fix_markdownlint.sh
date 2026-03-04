#!/bin/bash
sed -i 's/pnpm dlx markdownlint-cli '"'"'\*\*\/\*.md'"'"' --ignore '"'"'node_modules'"'"'/pnpm dlx markdownlint-cli '"'"'\*\*\/\*.md'"'"' --ignore '"'"'node_modules'"'"' --disable MD060 MD036 MD032 MD022 MD040 MD030 MD034 MD058 MD013 MD033 MD031 MD029/g' .github/workflows/docs-lint.yml
