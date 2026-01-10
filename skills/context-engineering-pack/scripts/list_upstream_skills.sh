#!/usr/bin/env bash
set -euo pipefail

ROOT="skills/vendor/agent-skills-context-engineering/skills"
if [[ ! -d "$ROOT" ]]; then
  echo "Missing upstream skills at $ROOT"
  exit 1
fi

echo "Upstream skills:"
find "$ROOT" -maxdepth 2 -name "SKILL.md" -print | sed "s|^$ROOT/||" | sed 's|/SKILL.md$||' | sort
