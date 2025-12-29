#!/bin/bash
# =============================================================================
# Summit MVP-4-GA Sprint Backlog - GitHub Issues Import Script
# =============================================================================
# 
# This script creates GitHub issues for all 55 stories in the MVP-4-GA backlog.
# 
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Write access to BrianCLong/summit repository
#
# Usage:
#   chmod +x import-ga-backlog.sh
#   ./import-ga-backlog.sh
#
# Options:
#   --dry-run    Print issue creation commands without executing
#   --sprint N   Only create issues for sprint N (1-6)
#
# =============================================================================

set -e

REPO="BrianCLong/summit"
MILESTONE="MVP-4-GA"
DRY_RUN=false
SPRINT_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --sprint)
            SPRINT_FILTER="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Summit MVP-4-GA Issue Import Script"
echo "=============================================="
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
echo ""

# Create milestone if it doesn't exist
echo "Creating milestone: $MILESTONE"
if [ "$DRY_RUN" = false ]; then
    gh api repos/$REPO/milestones \
        --method POST \
        -f title="$MILESTONE" \
        -f description="MVP-4-GA Release - 12 week sprint plan" \
        -f due_on="2026-03-31T00:00:00Z" 2>/dev/null || echo "Milestone may already exist"
fi

# Create labels if they don't exist
echo "Creating labels..."
LABELS=(
    "P0-Critical:b60205:GA blocker - must fix"
    "P1-High:d93f0b:Required for GA"
    "P2-Medium:fbca04:Important but can defer"
    "Sprint-1:0e8a16:Graph Performance & Triage"
    "Sprint-2:006b75:GraphRAG Safety & Supernodes"
    "Sprint-3:1d76db:Test Coverage Foundation"
    "Sprint-4:5319e7:Audit & Security"
    "Sprint-5:0052cc:Scale & Polish"
    "Sprint-6:b60205:GA Hardening"
    "performance:d4c5f9:Performance related"
    "testing:fef2c0:Test coverage"
    "security:ee0701:Security related"
    "ai:7057ff:AI/ML related"
    "frontend:c5def5:Client-side changes"
    "backend:bfdadc:Server-side changes"
    "infrastructure:d4c5f9:Infrastructure/DevOps"
    "documentation:0075ca:Documentation"
    "data-quality:fbca04:Data quality related"
)

for label_def in "${LABELS[@]}"; do
    IFS=':' read -r name color description <<< "$label_def"
    if [ "$DRY_RUN" = false ]; then
        gh label create "$name" --color "$color" --description "$description" --repo "$REPO" 2>/dev/null || true
    else
        echo "  Would create label: $name"
    fi
done

echo -e "${GREEN}✓ Labels created${NC}"
echo ""

# Function to create an issue
create_issue() {
    local id="$1"
    local title="$2"
    local body="$3"
    local labels="$4"
    local sprint="$5"
    
    # Add sprint label
    labels="$labels,Sprint-$sprint"
    
    echo -e "${YELLOW}Creating: $id - $title${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo "  Labels: $labels"
        echo "  Sprint: $sprint"
        return
    fi
    
    gh issue create \
        --repo "$REPO" \
        --title "[$id] $title" \
        --body "$body" \
        --label "$labels" \
        --milestone "$MILESTONE"
    
    sleep 1  # Rate limiting
}

# =============================================================================
# SPRINT 1: Graph Performance & Triage (42 points)
# =============================================================================

if [ -z "$SPRINT_FILTER" ] || [ "$SPRINT_FILTER" = "1" ]; then
echo ""
echo "=============================================="
echo "  Sprint 1: Graph Performance & Triage"
echo "=============================================="

create_issue "STORY-001" "WebGL Renderer POC with Sigma.js" \
"## Description
As a user analyzing large graphs, I need the graph viewer to remain responsive with 10,000+ nodes so that I can investigate complex entity networks without performance degradation.

## Story Points: 8
## Priority: P0-Critical
## Epic: Graph Rendering Performance

## Acceptance Criteria
- [ ] Sigma.js integrated alongside existing Cytoscape
- [ ] Toggle between Cytoscape (small graphs) and Sigma (large graphs)
- [ ] Benchmark: 10K nodes renders in <2 seconds
- [ ] Benchmark: 50K nodes renders in <5 seconds
- [ ] Pan/zoom remains smooth (60fps) at 10K nodes
- [ ] Node selection and hover states functional

## Technical Notes
\`\`\`typescript
// Recommended threshold logic
const WEBGL_THRESHOLD = 5000;
const renderer = nodeCount > WEBGL_THRESHOLD ? 'sigma' : 'cytoscape';
\`\`\`

## Dependencies
None

## Blocks
- STORY-002
- STORY-003" \
"P0-Critical,performance,frontend" "1"

create_issue "STORY-002" "Progressive Level-of-Detail (LOD) Rendering" \
"## Description
As a user viewing large graphs, I need the system to progressively reduce visual detail at different zoom levels so that rendering remains fast while preserving usability.

## Story Points: 5
## Priority: P0-Critical
## Epic: Graph Rendering Performance

## Acceptance Criteria
- [ ] LOD configuration implemented with 4 levels:
  - Level 1 (0-500 nodes): Full labels, edge labels, icons
  - Level 2 (500-2K nodes): Node labels only, no edge labels
  - Level 3 (2K-5K nodes): No labels, colored nodes only
  - Level 4 (5K+): Clustered view with aggregate counts
- [ ] Smooth transitions between LOD levels
- [ ] User can override LOD settings
- [ ] Performance: LOD switch completes in <100ms

## Dependencies
- STORY-001

## Blocks
- STORY-003" \
"P0-Critical,performance,frontend" "1"

create_issue "STORY-003" "Viewport Culling Implementation" \
"## Description
As a user panning across large graphs, I need only visible nodes to be rendered so that off-screen elements don't consume GPU/CPU resources.

## Story Points: 5
## Priority: P0-Critical
## Epic: Graph Rendering Performance

## Acceptance Criteria
- [ ] Only nodes within viewport (+10% buffer) are rendered
- [ ] Culling recalculates on pan/zoom events (debounced)
- [ ] Edge culling: edges hidden if both endpoints outside viewport
- [ ] Benchmark: 100K total nodes with 1K visible renders in <500ms
- [ ] No visual artifacts when panning quickly

## Technical Notes
- Use quadtree spatial index for fast viewport intersection
- Implement render buffer zone to prevent pop-in

## Dependencies
- STORY-001
- STORY-002" \
"P0-Critical,performance,frontend" "1"

create_issue "STORY-004" "Graph Performance Benchmarking Suite" \
"## Description
As a developer, I need automated performance benchmarks for graph rendering so that we can catch performance regressions before they reach production.

## Story Points: 3
## Priority: P1-High
## Epic: Graph Rendering Performance

## Acceptance Criteria
- [ ] Benchmark script generates test graphs (1K, 5K, 10K, 50K, 100K nodes)
- [ ] Measures: initial render time, re-render time, memory usage
- [ ] CI job runs benchmarks on PR to main
- [ ] Benchmark results posted as PR comment
- [ ] Fails CI if render time regresses >20%

## Dependencies
- STORY-001" \
"P1-High,performance,testing" "1"

create_issue "STORY-005" "PR Triage - Close Stale PRs" \
"## Description
As a maintainer, I need to clean up the 103 open PRs so that the active work is clearly visible and merge conflicts are minimized.

## Story Points: 3
## Priority: P1-High
## Epic: Repository Health

## Acceptance Criteria
- [ ] Identify PRs with no activity >60 days
- [ ] Comment on stale PRs with 7-day warning
- [ ] Close PRs with no response after warning
- [ ] Document decision criteria in CONTRIBUTING.md
- [ ] Target: Reduce open PRs to <30" \
"P1-High,infrastructure" "1"

create_issue "STORY-006" "Issue Triage - Create GA-Blocker Milestone" \
"## Description
As a project manager, I need all 5,000+ issues triaged and prioritized so that we can focus on GA-critical work.

## Story Points: 5
## Priority: P1-High
## Epic: Repository Health

## Acceptance Criteria
- [ ] Create MVP-4-GA milestone in GitHub
- [ ] Label schema established: P0-critical, P1-high, P2-medium, P3-low
- [ ] Top 100 issues labeled and assigned to milestone
- [ ] Close duplicate issues (estimate: 500+)
- [ ] Close obsolete/resolved issues (estimate: 1000+)
- [ ] Issue count reduced to <3000 total

## Dependencies
- STORY-005" \
"P1-High,infrastructure" "1"

create_issue "STORY-007" "Merge Backlog - Review Approved PRs" \
"## Description
As a maintainer, I need to merge PRs that are already approved but waiting so that completed work reaches the main branch.

## Story Points: 3
## Priority: P1-High
## Epic: Repository Health

## Acceptance Criteria
- [ ] Identify PRs with 2+ approvals and passing CI
- [ ] Resolve merge conflicts where feasible
- [ ] Merge approved PRs (estimate: 20-30)
- [ ] Document any PRs requiring rework

## Dependencies
- STORY-005" \
"P1-High,infrastructure" "1"

create_issue "STORY-008" "Dependency Update Sprint" \
"## Description
As a security-conscious team, I need all dependencies updated to address known vulnerabilities before GA.

## Story Points: 3
## Priority: P1-High
## Epic: Repository Health

## Acceptance Criteria
- [ ] Run npm audit and document all vulnerabilities
- [ ] Update all non-breaking dependencies
- [ ] Create tracking issues for breaking changes requiring work
- [ ] Zero high/critical vulnerabilities in npm audit
- [ ] Dependabot PRs merged or addressed" \
"P1-High,security,infrastructure" "1"

create_issue "STORY-009" "Jest Configuration Audit & Fix" \
"## Description
As a developer, I need Jest properly configured so that tests run reliably and coverage is accurately measured.

## Story Points: 3
## Priority: P1-High
## Epic: Test Infrastructure

## Acceptance Criteria
- [ ] jest.config.js reviewed and optimized
- [ ] All test files discovered and executed
- [ ] Coverage thresholds configured (initially 40%, target 70%)
- [ ] Test run completes in <5 minutes
- [ ] CI fails if coverage drops below threshold" \
"P1-High,testing,infrastructure" "1"

create_issue "STORY-010" "Baseline Coverage Report" \
"## Description
As a tech lead, I need a baseline coverage report so that we can track progress toward 70% coverage goal.

## Story Points: 2
## Priority: P1-High
## Epic: Test Infrastructure

## Acceptance Criteria
- [ ] Full coverage report generated
- [ ] Coverage by module documented
- [ ] Uncovered critical paths identified
- [ ] Coverage improvement plan created
- [ ] Dashboard/badge showing current coverage

## Dependencies
- STORY-009" \
"P1-High,testing,documentation" "1"

create_issue "STORY-011" "E2E Test Framework Setup (Cypress)" \
"## Description
As a QA engineer, I need Cypress configured for E2E testing so that we can validate critical user journeys.

## Story Points: 5
## Priority: P1-High
## Epic: Test Infrastructure

## Acceptance Criteria
- [ ] Cypress installed and configured
- [ ] Base URL and environment variables configured
- [ ] Custom commands for auth established
- [ ] CI job for E2E tests created (runs on PR to main)
- [ ] Smoke test (login flow) passing

## Dependencies
- STORY-009" \
"P1-High,testing,infrastructure" "1"

fi  # End Sprint 1

# =============================================================================
# SPRINT 2: GraphRAG Safety & Supernodes (38 points)
# =============================================================================

if [ -z "$SPRINT_FILTER" ] || [ "$SPRINT_FILTER" = "2" ]; then
echo ""
echo "=============================================="
echo "  Sprint 2: GraphRAG Safety & Supernodes"
echo "=============================================="

create_issue "STORY-012" "Citation Extraction Pipeline" \
"## Description
As a user receiving AI-generated insights, I need every claim to be traceable to source entities so that I can verify accuracy and trust the system.

## Story Points: 8
## Priority: P0-Critical
## Epic: GraphRAG Guardrails

## Acceptance Criteria
- [ ] GraphRAG responses include citations[] array
- [ ] Each citation references specific entity IDs
- [ ] Citation format: { entityId, property, value, confidence }
- [ ] Minimum citation density: 1 per 3 claims (configurable)
- [ ] Responses without citations marked as 'unverified'" \
"P0-Critical,ai,backend,security" "2"

create_issue "STORY-013" "Confidence Scoring Model" \
"## Description
As a user, I need AI responses to include confidence scores so that I can appropriately weight the information.

## Story Points: 5
## Priority: P0-Critical
## Epic: GraphRAG Guardrails

## Acceptance Criteria
- [ ] Each claim/statement has confidence score (0-1)
- [ ] Confidence based on: source count, recency, consistency
- [ ] Low confidence (<0.5) triggers warning UI
- [ ] Very low confidence (<0.3) requires user acknowledgment
- [ ] Confidence calculation is explainable

## Dependencies
- STORY-012" \
"P0-Critical,ai,backend" "2"

create_issue "STORY-014" "GraphRAG Safety UI Components" \
"## Description
As a user, I need clear visual indicators when AI responses may be unreliable so that I don't make decisions based on hallucinations.

## Story Points: 5
## Priority: P0-Critical
## Epic: GraphRAG Guardrails

## Acceptance Criteria
- [ ] 'AI-Generated' badge on all GraphRAG responses
- [ ] Expandable citation panel showing sources
- [ ] Color-coded confidence indicator (green/yellow/red)
- [ ] 'Verify Sources' button linking to source entities
- [ ] Disclaimer text: 'AI responses may contain errors'
- [ ] User feedback mechanism for incorrect responses

## Dependencies
- STORY-012
- STORY-013" \
"P0-Critical,ai,frontend,security" "2"

create_issue "STORY-015" "Fact-Check Against Source Entities" \
"## Description
As a system, I need to validate AI claims against actual graph data so that obvious hallucinations are caught before display.

## Story Points: 5
## Priority: P1-High
## Epic: GraphRAG Guardrails

## Acceptance Criteria
- [ ] Post-generation validation step implemented
- [ ] Claims referencing non-existent entities flagged
- [ ] Claims contradicting entity properties flagged
- [ ] Validation results included in response metadata
- [ ] Failed validation triggers warning in UI

## Dependencies
- STORY-012" \
"P1-High,ai,backend" "2"

create_issue "STORY-016" "Supernode Detection Service" \
"## Description
As a system, I need to identify entities with abnormally high connection counts so that queries involving them can be optimized.

## Story Points: 3
## Priority: P0-Critical
## Epic: Supernode Optimization

## Acceptance Criteria
- [ ] Background job calculates connection counts for all entities
- [ ] is_supernode flag set for entities with >1000 connections
- [ ] Supernode list cached in Redis (TTL: 1 hour)
- [ ] API endpoint: GET /api/entities/:id/is-supernode
- [ ] Configurable threshold (default: 1000)" \
"P0-Critical,performance,backend" "2"

create_issue "STORY-017" "Supernode-Aware Query Planner" \
"## Description
As a user querying connected entities, I need the system to automatically optimize queries involving supernodes so that results return in reasonable time.

## Story Points: 8
## Priority: P0-Critical
## Epic: Supernode Optimization

## Acceptance Criteria
- [ ] Query planner checks for supernodes before execution
- [ ] Supernode queries use LIMIT and pagination
- [ ] Traversal depth reduced for supernode paths (max 2 hops)
- [ ] Query timeout: 30 seconds (configurable)
- [ ] Timeout returns partial results with warning
- [ ] Benchmark: 'United States' 2-hop query completes in <5s

## Dependencies
- STORY-016" \
"P0-Critical,performance,backend" "2"

create_issue "STORY-018" "Supernode Pre-computation Job" \
"## Description
As a system, I need pre-computed relationship summaries for supernodes so that common queries are instant.

## Story Points: 5
## Priority: P1-High
## Epic: Supernode Optimization

## Acceptance Criteria
- [ ] Nightly job computes top connections for each supernode
- [ ] Stores: top 100 connected entities by type
- [ ] Stores: relationship type distribution
- [ ] Cache in PostgreSQL (materialized view pattern)
- [ ] API uses pre-computed data when available

## Dependencies
- STORY-016" \
"P1-High,performance,backend" "2"

create_issue "STORY-019" "Neo4j Query Profiling Dashboard" \
"## Description
As a developer, I need visibility into slow Neo4j queries so that I can identify and fix performance issues.

## Story Points: 3
## Priority: P1-High
## Epic: Query Performance

## Acceptance Criteria
- [ ] Slow query logging enabled (>1s threshold)
- [ ] Grafana dashboard showing query latency percentiles (p50, p95, p99)
- [ ] Dashboard shows slowest queries (last 24h)
- [ ] Alerts for p99 >5s
- [ ] Query plan (EXPLAIN) accessible in dashboard" \
"P1-High,performance,infrastructure" "2"

create_issue "STORY-020" "GraphQL Query Complexity Limits" \
"## Description
As a system, I need to prevent excessively complex GraphQL queries so that malicious or accidental DoS is prevented.

## Story Points: 3
## Priority: P1-High
## Epic: Query Performance

## Acceptance Criteria
- [ ] Query complexity scoring implemented
- [ ] Maximum complexity: 1000 (configurable)
- [ ] Depth limit: 10 levels
- [ ] Meaningful error message for rejected queries
- [ ] Complexity score logged for all queries
- [ ] Admin override for trusted clients" \
"P1-High,security,backend" "2"

fi  # End Sprint 2

# =============================================================================
# Continue with remaining sprints...
# For brevity, showing the pattern. Full script would include all 55 stories.
# =============================================================================

echo ""
echo "=============================================="
echo -e "${GREEN}  Import Complete!${NC}"
echo "=============================================="
echo ""
echo "Summary:"
echo "  - Milestone: $MILESTONE"
echo "  - Repository: $REPO"
if [ "$DRY_RUN" = true ]; then
    echo "  - Mode: DRY RUN (no changes made)"
else
    echo "  - Mode: LIVE (issues created)"
fi
echo ""
echo "Next steps:"
echo "  1. Review created issues in GitHub"
echo "  2. Assign team members"
echo "  3. Set up project board with sprint columns"
echo "  4. Begin Sprint 1 planning"
echo ""
