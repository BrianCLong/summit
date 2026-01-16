#!/bin/bash
# Schedule all issues without milestones into sprints

REPO="BrianCLong/summit"

echo "=============================================="
echo "   SCHEDULING UNASSIGNED ISSUES"
echo "=============================================="
echo ""

# Get all issues without milestones
echo "Fetching issues without milestones..."
issues=$(gh issue list --repo "$REPO" --state open --limit 2000 --json number,title,milestone | \
  jq -r '.[] | select(.milestone == null) | "\(.number)|\(.title)"')

total=$(echo "$issues" | grep -c "|" || echo 0)
echo "Found $total issues without milestones"
echo ""

move_by_pattern() {
  local pattern="$1"
  local milestone="$2"
  local limit="${3:-100}"
  local count=0

  while IFS='|' read -r num title; do
    [ -z "$num" ] && continue
    if echo "$title" | grep -qiE "$pattern"; then
      gh issue edit "$num" --repo "$REPO" --milestone "$milestone" 2>/dev/null && {
        count=$((count + 1))
        # Remove from remaining list conceptually
      }
      if [ $count -ge $limit ]; then
        break
      fi
    fi
  done <<< "$issues"

  if [ $count -gt 0 ]; then
    echo "  Moved $count issues matching '$pattern' -> $milestone"
  fi
}

echo "Phase 1: Security patterns..."
move_by_pattern "security|secure|auth|password|credential|access|privilege|OWASP|CVE|vuln|encrypt|audit|compliance|CIS|NIST|SOC|PCI|HIPAA|GDPR|policy|permission|rbac|abac|firewall|mfa|csrf|xss|injection|token|secret" "Sprint 4: Security Hardening" 150

echo "Phase 2: Infrastructure patterns..."
move_by_pattern "docker|container|kubernetes|k8s|helm|pod|image|registry|deploy|infra|server|host|cluster|node|network|load|proxy|nginx|ingress|volume|storage|backup" "Sprint 3: Docker & Containerization" 100

echo "Phase 3: CI/CD patterns..."
move_by_pattern "CI|CD|pipeline|build|release|version|rollback|staging|production|environment|workflow|action|artifact|package|publish|tag|branch|merge|PR|commit|git" "Sprint 2: CI/CD & Release Ops" 150

echo "Phase 4: Graph/Database patterns..."
move_by_pattern "graph|neo4j|cypher|query|index|cache|database|db|postgres|redis|mongo|entity|relationship|node|edge|traversal|schema|migration|data|ORM|SQL" "Sprint 5: Graph Performance" 100

echo "Phase 5: AI/ML patterns..."
move_by_pattern "AI|ML|LLM|model|inference|embedding|vector|RAG|GPT|Claude|train|predict|classify|detect|anomaly|NLP|language|sentiment|neural" "Sprint 6: AI/ML Foundation" 100

echo "Phase 6: API patterns..."
move_by_pattern "API|REST|GraphQL|endpoint|webhook|integration|service|microservice|gRPC|HTTP|request|response|client|SDK|library|plugin" "Sprint 7: Integration & APIs" 100

echo "Phase 7: Testing patterns..."
move_by_pattern "test|spec|coverage|quality|lint|e2e|unit|integration|mock|stub|fixture|assert|expect|jest|mocha|cypress|playwright|QA|verify|validate" "Sprint 8: Testing & Quality" 100

echo "Phase 8: Documentation patterns..."
move_by_pattern "doc|documentation|README|wiki|guide|tutorial|example|sample|comment|JSDoc|swagger|openapi|manual|help|instruction" "Sprint 9: Documentation" 50

echo "Phase 9: UI/UX patterns..."
move_by_pattern "UI|UX|frontend|component|style|CSS|SCSS|theme|design|layout|responsive|mobile|desktop|button|form|input|modal|dialog|toast|accessibility|color|font|icon" "Sprint 10: UI/UX Polish" 100

echo "Phase 10: Governance/Core patterns..."
move_by_pattern "governance|critical|core|foundation|essential|priority|urgent|blocker|P0|P1|must|required|mandatory|baseline|architecture|refactor|tech|cleanup|fix|bug|error|broken" "Sprint 1: Governance & Critical Security" 150

echo ""
echo "Phase 11: Round-robin remaining..."

# Get remaining unassigned issues and distribute
remaining=$(gh issue list --repo "$REPO" --state open --limit 2000 --json number,milestone | \
  jq -r '.[] | select(.milestone == null) | .number')

sprint_num=1
count=0
for num in $remaining; do
  case $sprint_num in
    1) milestone="Sprint 1: Governance & Critical Security";;
    2) milestone="Sprint 2: CI/CD & Release Ops";;
    3) milestone="Sprint 3: Docker & Containerization";;
    4) milestone="Sprint 4: Security Hardening";;
    5) milestone="Sprint 5: Graph Performance";;
    6) milestone="Sprint 6: AI/ML Foundation";;
    7) milestone="Sprint 7: Integration & APIs";;
    8) milestone="Sprint 8: Testing & Quality";;
    9) milestone="Sprint 9: Documentation";;
    10) milestone="Sprint 10: UI/UX Polish";;
  esac

  gh issue edit "$num" --repo "$REPO" --milestone "$milestone" 2>/dev/null && count=$((count + 1))

  sprint_num=$((sprint_num + 1))
  if [ $sprint_num -gt 10 ]; then
    sprint_num=1
  fi
done

echo "  Distributed $count remaining issues via round-robin"

echo ""
echo "=============================================="
echo "   SCHEDULING COMPLETE"
echo "=============================================="
final_unassigned=$(gh issue list --repo "$REPO" --state open --limit 2000 --json number,milestone | jq '[.[] | select(.milestone == null)] | length')
echo "Remaining unassigned: $final_unassigned"
