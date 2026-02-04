# scripts/github_setup_labels.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}

# Type
gh label create --repo "$REPO" "type:feature"       -c '#0e8a16' -d 'New functionality'
gh label create --repo "$REPO" "type:bug"            -c '#d73a4a' -d 'Defect'
gh label create --repo "$REPO" "type:chore"          -c '#c5def5' -d 'Maintenance'

# Priority
gh label create --repo "$REPO" "priority:P0" -c '#b60205' -d 'Blocker'
gh label create --repo "$REPO" "priority:P1" -c '#d93f0b' -d 'High'
gh label create --repo "$REPO" "priority:P2" -c '#fbca04' -d 'Medium'

# Size (story points mapping: S≈3, M≈5, L≈8, XL≈13)
gh label create --repo "$REPO" "size:S"  -c '#d4c5f9'
gh label create --repo "$REPO" "size:M"  -c '#bfd4f2'
gh label create --repo "$REPO" "size:L"  -c '#bfdadc'
gh label create --repo "$REPO" "size:XL" -c '#c2e0c6'

# Areas (Maestro)
for L in control-plane workflow runners sdk policy provenance console observability blueprints security integration docs catalog finops; do
  gh label create --repo "$REPO" "area:$L" -c '#0366d6' || true
done

# Areas (IntelGraph adoption)
for L in sig-api sig-ui sig-policy sig-export sig-ingest sig-observability; do
  gh label create --repo "$REPO" "area:$L" -c '#5319e7' || true
done

# Release targets
gh label create --repo "$REPO" mvp -c '#0052cc' -d 'Target MVP (Oct 15, 2025)'
gh label create --repo "$REPO" ga  -c '#1d76db' -d 'Target GA (Dec 15, 2025)'

echo "✅ Labels created for $REPO"
