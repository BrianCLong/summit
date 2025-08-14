#!/usr/bin/env bash
set -euo pipefail

# Usage: OWNER=yourorg REPO=intelgraph GH_ASSIGNEE=username ./scripts/bootstrap_github.sh
# Requires: GitHub CLI (gh) authenticated. Creates labels, milestones, and imports issues from CSV.

: "${OWNER:?Set OWNER}" "${REPO:?Set REPO}"
CSV_FILE="project_management/issues_enriched.csv"

gh repo view "$OWNER/$REPO" >/dev/null || { echo "Repo not accessible: $OWNER/$REPO"; exit 1; }

echo "Creating core labels…"
labels=(
  "P0::#d73a4a" "P1::#ff8c00" "P2::#fbca04"
  "documentation::#0075ca" "ci::#0e8a16" "security::#b60205" "graphrag::#5319e7" "ingest::#c5def5"
  "observability::#1d76db" "performance::#bfd4f2" "database::#0366d6" "neo4j::#6f42c1" "postgres::#0052cc"
  "ux::#a2eeef" "feature::#0e8a16" "ml::#5319e7" "audit::#e4e669" "ops::#d4c5f9" "release::#84b6eb" "testing::#0e8a16"
  "enhancement::#a2eeef" "backend::#0366d6" "frontend::#0e8a16" "real-time::#1d76db" "NLP::#6f42c1" "OSINT::#5319e7"
  "visualization::#a2eeef" "dashboard::#5319e7" "integration::#0366d6" "API::#0e8a16" "devops::#d4c5f9"
  "kubernetes::#84b6eb" "helm::#84b6eb" "terraform::#84b6eb" "cloud::#84b6eb" "CI/CD::#84b6eb"
  "monitoring::#1d76db" "e2e::#5319e7" "reliability::#d73a4a" "scalability::#bfd4f2" "compliance::#cfd3d7"
)
for l in "${labels[@]}"; do name="${l%%::*}"; color="${l##*::}"; gh label create "$name" --color "$color" --repo "$OWNER/$REPO" 2>/dev/null || true; done

# Create due date labels from CSV dynamically
node -e '
const fs=require("fs");
const txt=fs.readFileSync(process.argv[1],"utf8");
const rows=txt.split(/\r?\n/).slice(1).filter(Boolean);
const set=new Set();
for(const r of rows){
  let q=false,c="",f=[];for(let i=0;i<r.length;i++){const ch=r[i];if(q){if(ch==="\""&&r[i+1]==="\""){c+="\"";i++;}else if(ch==="\""){q=false;}else{c+=ch;}}else{if(ch==="\""){q=true;}else if(ch===","){f.push(c);c="";}else{c+=ch;}}}
  f.push(c);
  const labels=(f[2]||"").split(",").map(s=>s.trim()).filter(Boolean);
  for(const l of labels){ if(l.startsWith("due:")) set.add(l); }
}
console.log([...set].join("\n"));
' "$CSV_FILE" | while read -r due; do
  [ -n "$due" ] && gh label create "$due" --color "#ededed" --repo "$OWNER/$REPO" 2>/dev/null || true
done

echo "Creating milestones…"
# Adjust due dates as needed
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/milestones" \
  -f title='v0.1.0' -f due_on='2025-09-20T00:00:00Z' 2>/dev/null || true
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/milestones" \
  -f title='v0.2.0' -f due_on='2025-10-30T00:00:00Z' 2>/dev/null || true
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/milestones" \
  -f title='v0.3.0' -f due_on='2025-12-15T00:00:00Z' 2>/dev/null || true

echo "Importing/syncing issues from ${CSV_FILE}..."
OWNER="$OWNER" REPO="$REPO" node ./scripts/update_github_issues.js "${CSV_FILE}"

echo "Done."
