# scripts/github_setup_milestones.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}

gh milestone create --repo "$REPO" --title "MVP" --due-date 2025-10-15 --description "Maestro MVP per PRD"
gh milestone create --repo "$REPO" --title "GA"  --due-date 2025-12-15 --description "Maestro v1.0 GA"
gh milestone create --repo "$REPO" --title "v1.x (H1 2026)" --description "Post-GA improvements"

echo "✅ Milestones created for $REPO"
