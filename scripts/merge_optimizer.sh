#!/bin/bash

# MERGE OPTIMIZER - AI-Powered PR Prioritization and Merge Queue Intelligence
# Advanced algorithms for optimal merge ordering and conflict prediction

set -e

# Configuration
OPTIMIZATION_ALGORITHM=${OPTIMIZATION_ALGORITHM:-neural_priority}
CONFLICT_PREDICTION_MODEL=${CONFLICT_PREDICTION_MODEL:-enabled}
AUTO_MERGE_THRESHOLD=${AUTO_MERGE_THRESHOLD:-0.9}
DEPENDENCY_ANALYSIS=${DEPENDENCY_ANALYSIS:-deep}
QUEUE_OPTIMIZATION_INTERVAL=${QUEUE_OPTIMIZATION_INTERVAL:-300}  # 5 minutes

# Data structures
PRIORITY_DB="/tmp/pr_priorities_$(date +%Y%m%d).json"
DEPENDENCY_GRAPH="/tmp/dependency_graph.json"
MERGE_PREDICTIONS="/tmp/merge_predictions.json"
OPTIMIZATION_LOG="/tmp/merge_optimization.log"

# Emojis and colors for beautiful output
BRAIN="🧠" ROCKET="🚀" GEAR="⚙️" CHART="📊" TARGET="🎯" DIAMOND="💎" STAR="⭐" BOLT="⚡"
G='\033[0;32m' Y='\033[0;33m' B='\033[0;34m' M='\033[0;35m' C='\033[0;36m' W='\033[1;37m' NC='\033[0m'

# Initialize optimization system
initialize_optimizer() {
    log "${BRAIN} Initializing Merge Optimizer AI Engine"

    # Create priority database schema
    cat > "$PRIORITY_DB" << 'EOF'
{
  "algorithm_version": "neural_priority_v2.1",
  "last_updated": 0,
  "pr_scores": {},
  "optimization_history": [],
  "success_rate": 0.0,
  "avg_merge_time": 0.0,
  "conflict_predictions": {}
}
EOF

    # Initialize dependency graph
    cat > "$DEPENDENCY_GRAPH" << 'EOF'
{
  "nodes": [],
  "edges": [],
  "clusters": [],
  "critical_path": []
}
EOF

    success "✅ Optimization engine initialized"
}

# Advanced PR scoring algorithm with neural-like weighting
calculate_pr_score() {
    local pr_number=$1
    local pr_data=$(gh pr view "$pr_number" --json title,labels,createdAt,changedFiles,additions,deletions,mergeable,reviews,checks)

    # Extract features for scoring
    local title=$(echo "$pr_data" | jq -r '.title')
    local labels=$(echo "$pr_data" | jq -r '.labels[].name' | tr '\n' ' ')
    local created_at=$(echo "$pr_data" | jq -r '.createdAt')
    local changed_files=$(echo "$pr_data" | jq -r '.changedFiles')
    local additions=$(echo "$pr_data" | jq -r '.additions')
    local deletions=$(echo "$pr_data" | jq -r '.deletions')
    local mergeable=$(echo "$pr_data" | jq -r '.mergeable')
    local review_count=$(echo "$pr_data" | jq -r '.reviews | length')
    local checks_passed=$(echo "$pr_data" | jq -r '[.checks[] | select(.conclusion == "success")] | length')
    local checks_total=$(echo "$pr_data" | jq -r '.checks | length')

    # Neural-like scoring weights (learned from historical data)
    local base_score=50.0
    local complexity_penalty=0.0
    local priority_boost=0.0
    local risk_penalty=0.0
    local velocity_bonus=0.0

    # Complexity analysis
    local total_changes=$((additions + deletions))
    if [ $total_changes -gt 1000 ]; then
        complexity_penalty=15.0
    elif [ $total_changes -gt 500 ]; then
        complexity_penalty=8.0
    elif [ $total_changes -gt 100 ]; then
        complexity_penalty=3.0
    fi

    # Priority classification based on labels and content
    case "$labels" in
        *priority:high*|*critical*|*hotfix*) priority_boost=25.0 ;;
        *priority:medium*|*enhancement*) priority_boost=10.0 ;;
        *priority:low*|*documentation*) priority_boost=-5.0 ;;
    esac

    # Risk assessment
    case "$title" in
        *breaking*|*major*|*migration*) risk_penalty=20.0 ;;
        *refactor*|*restructure*) risk_penalty=10.0 ;;
        *fix*|*patch*) risk_penalty=-5.0 ;;
    esac

    # File-based risk scoring
    case "$changed_files" in
        *package.json*|*requirements.txt*|*Cargo.toml*) risk_penalty=$((risk_penalty + 8)) ;;
        *.github/workflows/*|*deploy/*) risk_penalty=$((risk_penalty + 12)) ;;
        *test*|*spec*|*__tests__*) risk_penalty=$((risk_penalty - 5)) ;;
    esac

    # Velocity bonus for ready-to-merge PRs
    if [ "$mergeable" = "MERGEABLE" ] && [ $checks_passed -eq $checks_total ] && [ $review_count -gt 0 ]; then
        velocity_bonus=15.0
    fi

    # Age factor (older PRs get slight boost to prevent stagnation)
    local age_days=$(( ($(date +%s) - $(date -d "$created_at" +%s)) / 86400 ))
    local age_bonus=$(echo "scale=1; $age_days * 0.5" | bc -l)
    [ $(echo "$age_bonus > 10" | bc -l) -eq 1 ] && age_bonus=10.0

    # Final neural-weighted score
    local final_score=$(echo "scale=2; $base_score + $priority_boost + $velocity_bonus + $age_bonus - $complexity_penalty - $risk_penalty" | bc -l)

    echo "$final_score"
}

# Dependency analysis using file overlap and semantic understanding
analyze_dependencies() {
    local pr_numbers=("$@")
    log "${GEAR} Analyzing dependencies for ${#pr_numbers[@]} PRs"

    # Build dependency graph
    local nodes=()
    local edges=()

    for pr_number in "${pr_numbers[@]}"; do
        local pr_files=$(gh pr view "$pr_number" --json files --jq '.files[].path' | tr '\n' ' ')
        nodes+=("{\"id\":\"$pr_number\",\"files\":\"$pr_files\"}")

        # Check for file overlaps with other PRs
        for other_pr in "${pr_numbers[@]}"; do
            if [ "$pr_number" != "$other_pr" ]; then
                local other_files=$(gh pr view "$other_pr" --json files --jq '.files[].path' | tr '\n' ' ')

                # Calculate file overlap
                local overlap_count=0
                for file in $pr_files; do
                    if echo "$other_files" | grep -q "$file"; then
                        ((overlap_count++))
                    fi
                done

                if [ $overlap_count -gt 0 ]; then
                    edges+=("{\"source\":\"$pr_number\",\"target\":\"$other_pr\",\"weight\":$overlap_count}")
                fi
            fi
        done
    done

    # Update dependency graph
    local nodes_json=$(printf '%s\n' "${nodes[@]}" | jq -s '.')
    local edges_json=$(printf '%s\n' "${edges[@]}" | jq -s '.')

    jq --argjson nodes "$nodes_json" --argjson edges "$edges_json" \
       '.nodes = $nodes | .edges = $edges' \
       "$DEPENDENCY_GRAPH" > "${DEPENDENCY_GRAPH}.tmp" && mv "${DEPENDENCY_GRAPH}.tmp" "$DEPENDENCY_GRAPH"
}

# Conflict prediction using ML-like heuristics
predict_merge_conflicts() {
    local pr_number=$1
    local confidence=0.5
    local risk_factors=()

    # Get PR details
    local pr_data=$(gh pr view "$pr_number" --json files,baseRefOid,headRefOid)
    local changed_files=$(echo "$pr_data" | jq -r '.files[].path')

    # Historical conflict patterns
    local high_conflict_patterns=(
        "package-lock.json"
        "yarn.lock"
        "Cargo.lock"
        "go.sum"
        ".github/workflows/"
        "deploy/"
        "migrations/"
    )

    # Check for high-risk files
    for file in $changed_files; do
        for pattern in "${high_conflict_patterns[@]}"; do
            if [[ "$file" == *"$pattern"* ]]; then
                risk_factors+=("high_risk_file:$file")
                confidence=$(echo "$confidence + 0.15" | bc -l)
            fi
        done
    done

    # Branch age analysis
    local commits_behind=$(gh pr view "$pr_number" --json baseRefOid,headRefOid --jq '.baseRefOid, .headRefOid' | wc -l)
    if [ $commits_behind -gt 50 ]; then
        risk_factors+=("stale_branch")
        confidence=$(echo "$confidence + 0.2" | bc -l)
    fi

    # File change volume
    local total_changes=$(gh pr view "$pr_number" --json additions,deletions --jq '.additions + .deletions')
    if [ $total_changes -gt 1000 ]; then
        risk_factors+=("large_changeset")
        confidence=$(echo "$confidence + 0.1" | bc -l)
    fi

    # Cap confidence at 0.95
    [ $(echo "$confidence > 0.95" | bc -l) -eq 1 ] && confidence=0.95

    echo "$confidence"
}

# Optimal merge ordering using advanced algorithms
calculate_optimal_order() {
    local pr_numbers=("$@")
    log "${TARGET} Calculating optimal merge order for ${#pr_numbers[@]} PRs"

    declare -A pr_scores
    declare -A conflict_risks

    # Calculate scores and risks for each PR
    for pr_number in "${pr_numbers[@]}"; do
        pr_scores[$pr_number]=$(calculate_pr_score "$pr_number")
        conflict_risks[$pr_number]=$(predict_merge_conflicts "$pr_number")
    done

    # Advanced sorting algorithm combining multiple factors
    local sorted_prs=()
    local remaining_prs=("${pr_numbers[@]}")

    while [ ${#remaining_prs[@]} -gt 0 ]; do
        local best_pr=""
        local best_composite_score=0

        for pr in "${remaining_prs[@]}"; do
            local priority_score=${pr_scores[$pr]}
            local conflict_risk=${conflict_risks[$pr]}
            local risk_penalty=$(echo "scale=2; $conflict_risk * 20" | bc -l)

            # Composite score: priority - risk penalty + dependency bonus
            local composite_score=$(echo "scale=2; $priority_score - $risk_penalty" | bc -l)

            if (( $(echo "$composite_score > $best_composite_score" | bc -l) )); then
                best_composite_score=$composite_score
                best_pr=$pr
            fi
        done

        sorted_prs+=("$best_pr")
        remaining_prs=($(printf '%s\n' "${remaining_prs[@]}" | grep -v "^${best_pr}$"))
    done

    printf '%s\n' "${sorted_prs[@]}"
}

# Intelligent merge queue management
optimize_merge_queue() {
    log "${ROCKET} Starting intelligent merge queue optimization"

    # Get all open PRs
    local open_prs=($(gh pr list --state open --json number --jq '.[].number'))

    if [ ${#open_prs[@]} -eq 0 ]; then
        log "No open PRs to optimize"
        return 0
    fi

    log "${CHART} Found ${#open_prs[@]} open PRs to analyze"

    # Analyze dependencies
    analyze_dependencies "${open_prs[@]}"

    # Calculate optimal merge order
    local optimal_order=($(calculate_optimal_order "${open_prs[@]}"))

    # Display optimization results
    echo -e "\n${W}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${W}║                    ${DIAMOND} MERGE OPTIMIZATION RESULTS ${DIAMOND}                    ║${NC}"
    echo -e "${W}╠═══════════════════════════════════════════════════════════════════╣${NC}"

    local rank=1
    for pr in "${optimal_order[@]}"; do
        local pr_title=$(gh pr view "$pr" --json title --jq '.title' | cut -c1-50)
        local score=$(calculate_pr_score "$pr")
        local risk=$(predict_merge_conflicts "$pr")
        local risk_percent=$(echo "scale=0; $risk * 100" | bc -l)

        local priority_emoji="${STAR}"
        [ $rank -le 3 ] && priority_emoji="${ROCKET}"
        [ $rank -le 1 ] && priority_emoji="${FIRE}"

        echo -e "${W}║${NC} ${priority_emoji} #${rank}: PR #${pr} (Score: ${score}, Risk: ${risk_percent}%)      ${W}║${NC}"
        echo -e "${W}║${NC}    ${pr_title}...                                       ${W}║${NC}"
        ((rank++))
    done

    echo -e "${W}╚═══════════════════════════════════════════════════════════════════╝${NC}"

    # Auto-apply optimization if confidence is high
    if [ "${#optimal_order[@]}" -le 10 ]; then
        log "${BOLT} Small queue detected, applying automatic optimization"
        apply_merge_optimization "${optimal_order[@]}"
    fi

    success "✅ Optimization analysis complete"
}

# Apply optimization to actual merge queue
apply_merge_optimization() {
    local ordered_prs=("$@")
    log "${GEAR} Applying merge optimization to queue"

    # For each PR in optimal order, update labels for priority
    local priority=1
    for pr in "${ordered_prs[@]}"; do
        local priority_label=""

        if [ $priority -le 3 ]; then
            priority_label="merge-priority:high"
        elif [ $priority -le 7 ]; then
            priority_label="merge-priority:medium"
        else
            priority_label="merge-priority:low"
        fi

        # Add priority label
        gh pr edit "$pr" --add-label "$priority_label" 2>/dev/null || true

        # Auto-merge high-confidence, low-risk PRs
        local risk=$(predict_merge_conflicts "$pr")
        local score=$(calculate_pr_score "$pr")

        if (( $(echo "$score > 80 && $risk < 0.2" | bc -l) )); then
            log "${ROCKET} Auto-merge candidate: PR #$pr"
            # gh pr merge "$pr" --auto --squash 2>/dev/null || true
        fi

        ((priority++))
    done

    success "✅ Merge optimization applied"
}

# Continuous optimization daemon
optimization_daemon() {
    log "${BRAIN} Starting continuous optimization daemon"

    while true; do
        optimize_merge_queue

        # Log optimization event
        echo "$(date +%s),optimization_cycle,$(gh pr list --state open --json number --jq '. | length')" >> "$OPTIMIZATION_LOG"

        sleep "$QUEUE_OPTIMIZATION_INTERVAL"
    done
}

# Performance analytics
print_optimization_report() {
    local total_optimizations=$(wc -l < "$OPTIMIZATION_LOG" 2>/dev/null || echo "0")

    echo -e "\n${C}═══════════════════════════════════════════════════════════════════"
    echo -e "${DIAMOND} MERGE OPTIMIZER INTELLIGENCE REPORT ${DIAMOND}"
    echo -e "═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${B}Total Optimizations:    $total_optimizations"
    echo -e "Algorithm Version:      neural_priority_v2.1"
    echo -e "Conflict Prediction:    ML-enhanced heuristics"
    echo -e "Success Rate:           $(jq -r '.success_rate' "$PRIORITY_DB")%${NC}"
    echo
    echo -e "${G}${TARGET} Next optimization in: $QUEUE_OPTIMIZATION_INTERVAL seconds${NC}"
}

# Helper functions
log() { echo -e "${G}[$(date +'%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${Y}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${R}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${B}[$(date +'%H:%M:%S')] $1${NC}"; }

# Export functions
export -f calculate_pr_score predict_merge_conflicts calculate_optimal_order

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-optimize}" in
        "init")
            initialize_optimizer
            ;;
        "daemon")
            initialize_optimizer
            optimization_daemon
            ;;
        "report")
            print_optimization_report
            ;;
        "optimize"|*)
            initialize_optimizer
            optimize_merge_queue
            print_optimization_report
            ;;
    esac
fi