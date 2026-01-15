#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SKILLSETS_SOURCE="${ROOT_DIR}/.summit/skillsets"
TARGET_DIR="${NORI_SKILLSETS_DIR:-${HOME}/.config/nori/skillsets}"

if command -v pnpm >/dev/null 2>&1; then
  pnpm add -g nori-ai-cli nori-skillsets
else
  npm install -g nori-ai-cli nori-skillsets
fi

mkdir -p "${TARGET_DIR}"
cp -f "${SKILLSETS_SOURCE}"/*.yaml "${TARGET_DIR}/"

echo "Summit skillsets installed to ${TARGET_DIR}."
cat <<'INSTRUCTIONS'
Authenticate with official provider CLIs:
- Claude Code: claude auth login
- OpenAI Codex: codex login
- Gemini CLI: gemini auth login
INSTRUCTIONS
