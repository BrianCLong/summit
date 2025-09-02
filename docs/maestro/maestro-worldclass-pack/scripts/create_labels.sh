#!/usr/bin/env bash
set -euo pipefail
echo "Creating labels..."
gh label create "epic" --color "#8250DF" --force
gh label create "router" --color "#0E8A16" --force
gh label create "agent-graph" --color "#1D76DB" --force
gh label create "serving" --color "#B60205" --force
gh label create "evalops" --color "#5319E7" --force
gh label create "otel" --color "#FBCA04" --force
gh label create "canary" --color "#BFDADC" --force
gh label create "security" --color "#E99695" --force
gh label create "docs" --color "#0E8A16" --force
gh label create "ui" --color "#1D76DB" --force
gh label create "good-first" --color "#7057FF" --force
gh label create "needs-design" --color "#C5DEF5" --force
gh label create "blocked" --color "#D93F0B" --force
gh label create "task" --color "#E6E6E6" --force
echo "Done."
