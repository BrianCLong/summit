#!/usr/bin/env bash
set -euo pipefail

DOC_TARGETS=("README.md" "docs/README.md" "docs/get-started" "docs/tutorials" "docs/how-tos" "docs/reference" "docs/concepts" "docs/architecture" "docs/operations" "docs/troubleshooting" "docs/release-notes" "docs/glossary.md" "docs/latest")

npx --yes markdownlint-cli ${DOC_TARGETS[@]}

npx --yes markdown-link-check --quiet README.md
echo "" | npx --yes markdown-link-check --quiet docs/README.md

npx --yes cspell --no-progress --no-summary README.md docs/README.md docs/get-started docs/tutorials docs/how-tos docs/reference docs/concepts docs/architecture docs/operations docs/troubleshooting docs/release-notes docs/glossary.md

npx --yes @mermaid-js/mermaid-cli@10.9.1 -i docs/architecture/diagrams/overview.mmd -o /tmp/overview.svg
npx --yes @mermaid-js/mermaid-cli@10.9.1 -i docs/architecture/diagrams/data-flow.mmd -o /tmp/data-flow.svg

echo "Documentation checks completed."
