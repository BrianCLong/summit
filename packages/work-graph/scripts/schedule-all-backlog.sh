#!/bin/bash
# Aggressively schedule ALL remaining backlog items into sprints

REPO="BrianCLong/summit"

echo "=============================================="
echo "   SCHEDULING ALL REMAINING BACKLOG ITEMS"
echo "=============================================="
echo ""

# Get current backlog count
backlog_count=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 1000 --json number | jq length)
echo "Starting backlog count: $backlog_count"
echo ""

move_by_pattern() {
  local pattern="$1"
  local milestone="$2"
  local limit="${3:-50}"

  issues=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 500 --json number,title | \
    jq -r ".[] | select(.title | test(\"$pattern\"; \"i\")) | .number" | head -$limit)

  count=0
  for num in $issues; do
    gh issue edit "$num" --repo "$REPO" --milestone "$milestone" 2>/dev/null && count=$((count + 1))
  done

  if [ $count -gt 0 ]; then
    echo "  Moved $count issues matching '$pattern' -> $milestone"
  fi
}

echo "Phase 1: Security & Compliance patterns..."
move_by_pattern "security|secure|auth|password|credential|access.control|privilege|OWASP|CVE|vuln|encrypt|audit|compliance|CIS|NIST|SOC|PCI|HIPAA|GDPR|policy|permission|rbac|abac|firewall|mfa|csrf|xss|injection|token" "Sprint 4: Security Hardening" 100

echo "Phase 2: Infrastructure & DevOps patterns..."
move_by_pattern "docker|container|kubernetes|k8s|helm|pod|image|registry|deploy|infra|server|host|cluster|node|network|load.balance|proxy|nginx|ingress|egress|volume|storage|backup|restore|disaster|recovery" "Sprint 3: Docker & Containerization" 80

echo "Phase 3: CI/CD & Release patterns..."
move_by_pattern "CI|CD|pipeline|build|release|version|deploy|rollback|staging|production|environment|workflow|action|artifact|package|publish|tag|branch|merge|PR|pull.request|commit|git" "Sprint 2: CI/CD & Release Ops" 80

echo "Phase 4: Graph & Database patterns..."
move_by_pattern "graph|neo4j|cypher|query|index|cache|database|db|postgres|redis|mongo|entity|relationship|node|edge|traversal|schema|migration|data.model|ORM|SQL|NoSQL" "Sprint 5: Graph Performance" 60

echo "Phase 5: AI/ML patterns..."
move_by_pattern "AI|ML|LLM|model|inference|embedding|vector|RAG|GPT|Claude|Anthropic|OpenAI|train|predict|classify|detect|anomaly|NLP|language|sentiment|neural|deep.learn|machine.learn" "Sprint 6: AI/ML Foundation" 60

echo "Phase 6: API & Integration patterns..."
move_by_pattern "API|REST|GraphQL|endpoint|webhook|integration|service|microservice|gRPC|HTTP|request|response|client|SDK|library|plugin|extension|connect|sync|import|export" "Sprint 7: Integration & APIs" 60

echo "Phase 7: Testing & Quality patterns..."
move_by_pattern "test|spec|coverage|quality|lint|e2e|unit|integration|mock|stub|fixture|assert|expect|jest|mocha|cypress|playwright|selenium|QA|verify|validate|check" "Sprint 8: Testing & Quality" 60

echo "Phase 8: Documentation patterns..."
move_by_pattern "doc|documentation|README|wiki|guide|tutorial|example|sample|comment|JSDoc|TypeDoc|swagger|openapi|spec|manual|help|instruction|reference" "Sprint 9: Documentation" 40

echo "Phase 9: UI/UX patterns..."
move_by_pattern "UI|UX|frontend|component|style|CSS|SCSS|theme|design|layout|responsive|mobile|desktop|button|form|input|modal|dialog|toast|notification|accessibility|a11y|color|font|icon|image|visual" "Sprint 10: UI/UX Polish" 60

echo "Phase 10: Core/Governance patterns..."
move_by_pattern "governance|critical|core|foundation|essential|priority|urgent|blocker|P0|P1|must.have|required|mandatory|baseline|fundamental|architecture|refactor|tech.debt|cleanup|fix|bug|issue|error|broken" "Sprint 1: Governance & Critical Security" 100

echo ""
echo "Phase 11: Distribute remaining by round-robin..."
# Get any remaining backlog items and distribute them
remaining=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 500 --json number | jq -r '.[].number')

sprint_num=1
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

  gh issue edit "$num" --repo "$REPO" --milestone "$milestone" 2>/dev/null

  sprint_num=$((sprint_num + 1))
  if [ $sprint_num -gt 10 ]; then
    sprint_num=1
  fi
done

echo ""
echo "=============================================="
echo "   SCHEDULING COMPLETE"
echo "=============================================="
final_backlog=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 1000 --json number | jq length)
echo "Final backlog count: $final_backlog"
echo "Issues scheduled: $((backlog_count - final_backlog))"
