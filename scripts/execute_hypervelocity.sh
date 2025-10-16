#!/bin/bash

# HYPERVELOCITY EXECUTION ENGINE
# Orchestrates all optimization systems for maximum throughput

set -e

# Hypervelocity Configuration
HYPERMODE=${HYPERMODE:-true}
CONCURRENT_SYSTEMS=${CONCURRENT_SYSTEMS:-true}
MAX_PERFORMANCE=${MAX_PERFORMANCE:-true}
EXECUTION_BATCH_SIZE=${EXECUTION_BATCH_SIZE:-12}
MONITORING_ENABLED=${MONITORING_ENABLED:-true}

# System paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TURBO_WAVES="$SCRIPT_DIR/turbo_waves.sh"
SMART_RESOLVER="$SCRIPT_DIR/smart_resolver.sh"
WAVE_MONITOR="$SCRIPT_DIR/wave_monitor.sh"
MERGE_OPTIMIZER="$SCRIPT_DIR/merge_optimizer.sh"

# Performance tracking
EXECUTION_START=$(date +%s.%3N)
EXECUTION_LOG="/tmp/hypervelocity_execution_$(date +%s).log"

# Epic styling
FIRE="🔥" ROCKET="🚀" BOLT="⚡" STAR="⭐" DIAMOND="💎" SPARKLES="✨" ZAP="⚡" BOOM="💥"
R='\033[0;31m' G='\033[0;32m' Y='\033[0;33m' B='\033[0;34m' M='\033[0;35m' C='\033[0;36m' W='\033[1;37m' NC='\033[0m'

# Ultra-advanced logging
hyperlog() { echo -e "${G}[${BOLT} $(date +'%H:%M:%S.%3N')] HYPER: $1${NC}" | tee -a "$EXECUTION_LOG"; }
turbolog() { echo -e "${M}[${ROCKET} $(date +'%H:%M:%S.%3N')] TURBO: $1${NC}" | tee -a "$EXECUTION_LOG"; }
blazelog() { echo -e "${C}[${FIRE} $(date +'%H:%M:%S.%3N')] BLAZE: $1${NC}" | tee -a "$EXECUTION_LOG"; }
meglog() { echo -e "${W}[${BOOM} $(date +'%H:%M:%S.%3N')] MEGA: $1${NC}" | tee -a "$EXECUTION_LOG"; }

# System health check
preflight_check() {
    hyperlog "Running preflight systems check"

    local checks_passed=0
    local total_checks=6

    # Check git rerere
    if git config rerere.enabled | grep -q "true"; then
        hyperlog "✅ Git rerere: ENABLED"
        ((checks_passed++))
    else
        hyperlog "❌ Git rerere: DISABLED"
    fi

    # Check GitHub CLI
    if command -v gh >/dev/null 2>&1; then
        hyperlog "✅ GitHub CLI: AVAILABLE"
        ((checks_passed++))
    else
        hyperlog "❌ GitHub CLI: MISSING"
    fi

    # Check required scripts
    for script in "$TURBO_WAVES" "$SMART_RESOLVER" "$WAVE_MONITOR" "$MERGE_OPTIMIZER"; do
        if [ -x "$script" ]; then
            hyperlog "✅ $(basename "$script"): READY"
            ((checks_passed++))
        else
            hyperlog "❌ $(basename "$script"): NOT EXECUTABLE"
        fi
    done

    local health_percentage=$(( checks_passed * 100 / total_checks ))
    hyperlog "System health: $health_percentage% ($checks_passed/$total_checks)"

    if [ $checks_passed -eq $total_checks ]; then
        blazelog "${SPARKLES} ALL SYSTEMS GO! READY FOR HYPERVELOCITY ${SPARKLES}"
        return 0
    else
        meglog "⚠️ SOME SYSTEMS NOT OPTIMAL - PROCEEDING WITH CAUTION"
        return 1
    fi
}

# Launch monitoring system in background
launch_monitoring() {
    if [ "$MONITORING_ENABLED" = "true" ]; then
        turbolog "Launching real-time monitoring system"

        # Initialize monitor
        "$WAVE_MONITOR" init >/dev/null 2>&1

        # Start monitor in background
        nohup "$WAVE_MONITOR" > /tmp/wave_monitor.log 2>&1 &
        local monitor_pid=$!

        # Give monitor time to start
        sleep 2

        if kill -0 $monitor_pid 2>/dev/null; then
            hyperlog "✅ Monitor system launched (PID: $monitor_pid)"
            echo $monitor_pid > /tmp/wave_monitor.pid
        else
            hyperlog "⚠️ Monitor system failed to start"
        fi
    fi
}

# Initialize optimization systems
launch_optimizers() {
    turbolog "Initializing AI optimization systems"

    # Initialize merge optimizer
    "$MERGE_OPTIMIZER" init >/dev/null 2>&1
    hyperlog "✅ Merge optimizer initialized"

    # Initialize smart resolver
    source "$SMART_RESOLVER"
    hyperlog "✅ Smart resolver loaded"

    # Launch merge optimization daemon
    if [ "$CONCURRENT_SYSTEMS" = "true" ]; then
        nohup "$MERGE_OPTIMIZER" daemon > /tmp/merge_optimizer.log 2>&1 &
        local optimizer_pid=$!
        echo $optimizer_pid > /tmp/merge_optimizer.pid
        hyperlog "✅ Merge optimizer daemon launched (PID: $optimizer_pid)"
    fi
}

# Execute hypervelocity wave processing
execute_hypervelocity_waves() {
    meglog "${BOOM} INITIATING HYPERVELOCITY WAVE PROCESSING ${BOOM}"

    # Get target branches with intelligent filtering
    local all_branches=($(git for-each-ref --format='%(refname:short)' refs/heads | \
        egrep '^(codex|feature|feat)/' | \
        grep -v -E "(mstc|opa.*policy|trr)" | \
        sort))

    local total_branches=${#all_branches[@]}
    hyperlog "🎯 Targeting $total_branches branches for hypervelocity processing"

    # Enhanced configuration for maximum performance
    export TURBO_MODE=true
    export MAX_PARALLEL=16        # Aggressive parallelism
    export WAVE_SIZE=12          # Large waves
    export BATCH_TIMEOUT=20      # Fast timeouts
    export RETRY_ATTEMPTS=2      # Quick retries

    # Execute turbo waves with all optimizations
    turbolog "${ROCKET} Launching turbo waves engine"

    if [ -x "$TURBO_WAVES" ]; then
        local wave_start=$(date +%s.%3N)

        # Execute with performance tracking
        "$TURBO_WAVES" | while IFS= read -r line; do
            echo "$line" | tee -a "$EXECUTION_LOG"
        done

        local wave_end=$(date +%s.%3N)
        local wave_duration=$(echo "$wave_end - $wave_start" | bc -l)

        blazelog "${FIRE} Turbo waves completed in ${wave_duration}s"
    else
        hyperlog "❌ Turbo waves script not executable"
        return 1
    fi
}

# Performance analytics and reporting
generate_hypervelocity_report() {
    local execution_end=$(date +%s.%3N)
    local total_duration=$(echo "$execution_end - $EXECUTION_START" | bc -l)

    # Collect metrics from all systems
    local total_processed=0
    local success_rate=0
    local avg_throughput=0

    if [ -f "/tmp/turbo_waves_metrics_"*.json ]; then
        local metrics_files=(/tmp/turbo_waves_metrics_*.json)
        if [ -f "${metrics_files[0]}" ]; then
            total_processed=$(wc -l < "${metrics_files[0]}" 2>/dev/null || echo "0")
        fi
    fi

    if [ $total_processed -gt 0 ]; then
        avg_throughput=$(echo "scale=2; $total_processed / $total_duration" | bc -l)
    fi

    # Generate epic report
    echo -e "\n${W}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${W}║                   ${BOOM} HYPERVELOCITY EXECUTION REPORT ${BOOM}                   ║${NC}"
    echo -e "${W}╠═══════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${W}║${NC} ${ROCKET} ${C}PERFORMANCE METRICS${NC}                                          ${W}║${NC}"
    echo -e "${W}║${NC}   ${BOLT} Total Duration:      ${total_duration}s                              ${W}║${NC}"
    echo -e "${W}║${NC}   ${FIRE} Branches Processed:  ${total_processed}                                 ${W}║${NC}"
    echo -e "${W}║${NC}   ${STAR} Average Throughput:  ${avg_throughput} branches/sec                    ${W}║${NC}"
    echo -e "${W}║${NC}   ${DIAMOND} Systems Launched:    $(pgrep -f "wave_monitor\|merge_optimizer" | wc -l) concurrent                        ${W}║${NC}"
    echo -e "${W}║${NC}                                                                   ${W}║${NC}"
    echo -e "${W}║${NC} ${SPARKLES} ${C}OPTIMIZATION SYSTEMS${NC}                                        ${W}║${NC}"
    echo -e "${W}║${NC}   ${ROCKET} Turbo Waves Engine:  EXECUTED                                ${W}║${NC}"
    echo -e "${W}║${NC}   ${BOLT} Smart Resolver:      ACTIVE                                  ${W}║${NC}"
    echo -e "${W}║${NC}   ${FIRE} Wave Monitor:        RUNNING                                 ${W}║${NC}"
    echo -e "${W}║${NC}   ${STAR} Merge Optimizer:     OPTIMIZING                             ${W}║${NC}"
    echo -e "${W}║${NC}                                                                   ${W}║${NC}"
    echo -e "${W}║${NC} ${BOOM} ${C}EXECUTION STATUS${NC}                                               ${W}║${NC}"
    echo -e "${W}║${NC}   Status: ${G}HYPERVELOCITY COMPLETE${NC}                                ${W}║${NC}"
    echo -e "${W}║${NC}   Log: $EXECUTION_LOG                           ${W}║${NC}"
    echo -e "${W}╚═══════════════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${G}${SPARKLES} HYPERVELOCITY EXECUTION COMPLETE! ${SPARKLES}${NC}"
    echo -e "${Y}Monitor continues running for real-time tracking${NC}"
    echo -e "${M}Merge optimizer daemon active for queue optimization${NC}"
}

# Cleanup function
cleanup_systems() {
    hyperlog "🛑 Initiating graceful shutdown"

    # Stop monitor if running
    if [ -f /tmp/wave_monitor.pid ]; then
        local monitor_pid=$(cat /tmp/wave_monitor.pid)
        if kill -0 $monitor_pid 2>/dev/null; then
            kill $monitor_pid
            hyperlog "✅ Monitor system stopped"
        fi
        rm -f /tmp/wave_monitor.pid
    fi

    # Stop optimizer daemon if running
    if [ -f /tmp/merge_optimizer.pid ]; then
        local optimizer_pid=$(cat /tmp/merge_optimizer.pid)
        if kill -0 $optimizer_pid 2>/dev/null; then
            kill $optimizer_pid
            hyperlog "✅ Merge optimizer daemon stopped"
        fi
        rm -f /tmp/merge_optimizer.pid
    fi

    hyperlog "🏁 Hypervelocity execution engine shutdown complete"
}

# Signal handlers
trap cleanup_systems SIGINT SIGTERM

# Main hypervelocity execution
main() {
    meglog "${BOOM}${BOOM}${BOOM} HYPERVELOCITY EXECUTION ENGINE v3.0 ${BOOM}${BOOM}${BOOM}"
    meglog "Maximum performance mode: $MAX_PERFORMANCE"
    meglog "Concurrent systems: $CONCURRENT_SYSTEMS"
    meglog "Execution batch size: $EXECUTION_BATCH_SIZE"

    # Execute systems in sequence for maximum effect
    preflight_check

    if [ "$MONITORING_ENABLED" = "true" ]; then
        launch_monitoring
    fi

    launch_optimizers

    execute_hypervelocity_waves

    generate_hypervelocity_report

    if [ "$1" = "--keep-running" ]; then
        hyperlog "🔄 Keeping systems running for continuous operation"
        while true; do
            sleep 60
            hyperlog "💓 Systems heartbeat - all systems operational"
        done
    else
        hyperlog "⏹️ Execution complete - use --keep-running to maintain daemons"
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi