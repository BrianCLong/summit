#!/bin/bash

# WAVE MONITOR - Real-time Performance Analytics and Monitoring
# Live dashboard for continuous wave processing with predictive insights

set -e

# Monitoring Configuration
MONITOR_INTERVAL=${MONITOR_INTERVAL:-2}  # 2-second updates
DASHBOARD_PORT=${DASHBOARD_PORT:-8888}
METRICS_RETENTION=${METRICS_RETENTION:-3600}  # 1 hour
ALERT_THRESHOLD_FAILURE_RATE=${ALERT_THRESHOLD_FAILURE_RATE:-0.15}  # 15%
ALERT_THRESHOLD_LATENCY=${ALERT_THRESHOLD_LATENCY:-30}  # 30 seconds

# Data structures
METRICS_DIR="/tmp/wave_metrics"
DASHBOARD_FILE="$METRICS_DIR/dashboard.html"
LIVE_DATA="$METRICS_DIR/live_data.json"
PERFORMANCE_LOG="$METRICS_DIR/performance.log"

# Ensure metrics directory
mkdir -p "$METRICS_DIR"

# Colors and emojis for beautiful output
R='\033[0;31m' G='\033[0;32m' Y='\033[0;33m' B='\033[0;34m' M='\033[0;35m' C='\033[0;36m' W='\033[1;37m' NC='\033[0m'
FIRE="🔥" ROCKET="🚀" BOLT="⚡" CHART="📊" WARNING="⚠️" SUCCESS="✅" ERROR="❌" SPEED="💨"

# Initialize monitoring system
initialize_monitor() {
    log "🚀 Initializing Wave Monitor v2.0"

    # Create live data structure
    cat > "$LIVE_DATA" << 'EOF'
{
  "start_time": 0,
  "current_time": 0,
  "total_processed": 0,
  "total_success": 0,
  "total_failures": 0,
  "current_wave": 0,
  "active_workers": 0,
  "queue_size": 0,
  "throughput": 0.0,
  "success_rate": 0.0,
  "avg_latency": 0.0,
  "peak_throughput": 0.0,
  "eta_completion": 0,
  "recent_metrics": [],
  "alerts": []
}
EOF

    # Initialize performance log
    echo "timestamp,wave,branch,status,duration,throughput,success_rate" > "$PERFORMANCE_LOG"

    success "✅ Monitor initialized"
}

# Real-time data collection
collect_metrics() {
    local current_time=$(date +%s)
    local total_processed=0
    local total_success=0
    local total_failures=0
    local active_workers=0
    local queue_size=0

    # Gather data from various sources
    if [ -f "/tmp/turbo_waves_metrics_"*.json ]; then
        local metrics_files=(/tmp/turbo_waves_metrics_*.json)
        if [ -f "${metrics_files[0]}" ]; then
            total_processed=$(wc -l < "${metrics_files[0]}" 2>/dev/null || echo "0")
        fi
    fi

    # Count active git/gh processes (proxy for active workers)
    active_workers=$(pgrep -f "git\|gh" | wc -l)

    # Estimate queue size from branch count
    queue_size=$(git for-each-ref --format='%(refname:short)' refs/heads | \
        egrep '^(codex|feature|feat)/' | wc -l)

    # Calculate metrics
    local start_time=$(jq -r '.start_time' "$LIVE_DATA" 2>/dev/null || echo "$current_time")
    [ "$start_time" -eq 0 ] && start_time=$current_time

    local duration=$((current_time - start_time))
    local throughput=0
    local success_rate=0

    if [ $duration -gt 0 ]; then
        throughput=$(echo "scale=2; $total_processed / $duration" | bc -l 2>/dev/null || echo "0")
    fi

    if [ $total_processed -gt 0 ]; then
        success_rate=$(echo "scale=2; $total_success / $total_processed" | bc -l 2>/dev/null || echo "0")
    fi

    # Update live data
    jq --arg ct "$current_time" \
       --arg st "$start_time" \
       --arg tp "$total_processed" \
       --arg ts "$total_success" \
       --arg tf "$total_failures" \
       --arg aw "$active_workers" \
       --arg qs "$queue_size" \
       --arg th "$throughput" \
       --arg sr "$success_rate" \
       '.current_time = ($ct | tonumber) |
        .start_time = ($st | tonumber) |
        .total_processed = ($tp | tonumber) |
        .total_success = ($ts | tonumber) |
        .total_failures = ($tf | tonumber) |
        .active_workers = ($aw | tonumber) |
        .queue_size = ($qs | tonumber) |
        .throughput = ($th | tonumber) |
        .success_rate = ($sr | tonumber)' \
        "$LIVE_DATA" > "${LIVE_DATA}.tmp" && mv "${LIVE_DATA}.tmp" "$LIVE_DATA"
}

# Predictive analytics
calculate_predictions() {
    local current_throughput=$(jq -r '.throughput' "$LIVE_DATA")
    local queue_size=$(jq -r '.queue_size' "$LIVE_DATA")
    local eta=0

    if (( $(echo "$current_throughput > 0" | bc -l) )); then
        eta=$(echo "scale=0; $queue_size / $current_throughput" | bc -l 2>/dev/null || echo "0")
    fi

    # Update ETA
    jq --arg eta "$eta" '.eta_completion = ($eta | tonumber)' \
        "$LIVE_DATA" > "${LIVE_DATA}.tmp" && mv "${LIVE_DATA}.tmp" "$LIVE_DATA"
}

# Alert system
check_alerts() {
    local success_rate=$(jq -r '.success_rate' "$LIVE_DATA")
    local avg_latency=${1:-0}
    local alerts=()

    # Failure rate alert
    if (( $(echo "$success_rate < (1 - $ALERT_THRESHOLD_FAILURE_RATE)" | bc -l) )); then
        alerts+=("{\"type\":\"failure_rate\",\"message\":\"High failure rate: $(printf "%.1f%%" $(echo "$success_rate * 100" | bc -l))\",\"severity\":\"warning\"}")
    fi

    # Latency alert
    if (( $(echo "$avg_latency > $ALERT_THRESHOLD_LATENCY" | bc -l) )); then
        alerts+=("{\"type\":\"latency\",\"message\":\"High latency: ${avg_latency}s\",\"severity\":\"warning\"}")
    fi

    # Update alerts
    if [ ${#alerts[@]} -gt 0 ]; then
        local alerts_json=$(printf '%s\n' "${alerts[@]}" | jq -s '.')
        jq --argjson alerts "$alerts_json" '.alerts = $alerts' \
            "$LIVE_DATA" > "${LIVE_DATA}.tmp" && mv "${LIVE_DATA}.tmp" "$LIVE_DATA"
    fi
}

# Real-time dashboard
display_dashboard() {
    clear

    local data=$(cat "$LIVE_DATA")
    local current_time=$(echo "$data" | jq -r '.current_time')
    local start_time=$(echo "$data" | jq -r '.start_time')
    local total_processed=$(echo "$data" | jq -r '.total_processed')
    local total_success=$(echo "$data" | jq -r '.total_success')
    local total_failures=$(echo "$data" | jq -r '.total_failures')
    local active_workers=$(echo "$data" | jq -r '.active_workers')
    local queue_size=$(echo "$data" | jq -r '.queue_size')
    local throughput=$(echo "$data" | jq -r '.throughput')
    local success_rate=$(echo "$data" | jq -r '.success_rate')
    local eta=$(echo "$data" | jq -r '.eta_completion')

    local duration=$((current_time - start_time))
    local success_percent=$(echo "scale=1; $success_rate * 100" | bc -l 2>/dev/null || echo "0")

    # Header
    echo -e "${W}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${W}║                    ${ROCKET} WAVE MONITOR LIVE DASHBOARD ${ROCKET}                    ║${NC}"
    echo -e "${W}╠═══════════════════════════════════════════════════════════════════╣${NC}"

    # Core metrics
    echo -e "${W}║${NC} ${CHART} ${C}PERFORMANCE METRICS${NC}                                          ${W}║${NC}"
    echo -e "${W}║${NC}   ${BOLT} Throughput:       ${G}${throughput} branches/sec${NC}                       ${W}║${NC}"
    echo -e "${W}║${NC}   ${SUCCESS} Success Rate:     ${G}${success_percent}%${NC}                                ${W}║${NC}"
    echo -e "${W}║${NC}   ${SPEED} Total Processed:  ${B}${total_processed}${NC}                                  ${W}║${NC}"
    echo -e "${W}║${NC}   ${FIRE} Active Workers:    ${Y}${active_workers}${NC}                                   ${W}║${NC}"
    echo -e "${W}║${NC}   📋 Queue Size:       ${M}${queue_size}${NC}                                   ${W}║${NC}"

    # Time metrics
    echo -e "${W}║${NC}                                                                   ${W}║${NC}"
    echo -e "${W}║${NC} ${CHART} ${C}TIME ANALYSIS${NC}                                                ${W}║${NC}"
    echo -e "${W}║${NC}   ⏱️  Duration:         ${duration}s                                     ${W}║${NC}"
    echo -e "${W}║${NC}   🎯 ETA Completion:   ${eta}s                                      ${W}║${NC}"

    # Progress bar
    local progress=0
    if [ $queue_size -gt 0 ]; then
        progress=$(echo "scale=0; ($total_processed * 50) / $queue_size" | bc -l 2>/dev/null || echo "0")
    fi
    [ $progress -gt 50 ] && progress=50

    local filled=$(printf "%*s" $progress "" | tr ' ' '█')
    local empty=$(printf "%*s" $((50 - progress)) "" | tr ' ' '░')

    echo -e "${W}║${NC}                                                                   ${W}║${NC}"
    echo -e "${W}║${NC} 📊 ${C}PROGRESS${NC} [${G}${filled}${B}${empty}${NC}] ${progress}%                   ${W}║${NC}"

    # Alerts
    local alerts_count=$(echo "$data" | jq '.alerts | length')
    if [ "$alerts_count" -gt 0 ]; then
        echo -e "${W}║${NC}                                                                   ${W}║${NC}"
        echo -e "${W}║${NC} ${WARNING} ${Y}ACTIVE ALERTS${NC}                                              ${W}║${NC}"
        echo "$data" | jq -r '.alerts[] | "║   " + .type + ": " + .message' | head -3
    fi

    echo -e "${W}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${G}Last Update: $(date)${NC}"
    echo -e "${Y}Press Ctrl+C to exit monitor${NC}"
}

# Web dashboard generator
generate_web_dashboard() {
    cat > "$DASHBOARD_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Wave Monitor Dashboard</title>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="2">
    <style>
        body { font-family: monospace; background: #0d1117; color: #c9d1d9; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; color: #58a6ff; font-size: 24px; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
        .metric-title { color: #f0f6fc; font-weight: bold; margin-bottom: 10px; }
        .metric-value { font-size: 32px; color: #3fb950; }
        .progress-bar { background: #21262d; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { background: linear-gradient(90deg, #238636, #3fb950); height: 100%; transition: width 0.3s; }
        .alert { background: #da3633; color: white; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .chart { height: 200px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">🚀 Wave Monitor Live Dashboard 🚀</div>
        <div id="content">Loading...</div>
    </div>
    <script>
        async function updateData() {
            try {
                const response = await fetch('/tmp/wave_metrics/live_data.json');
                const data = await response.json();
                updateDashboard(data);
            } catch (e) {
                console.error('Failed to update data:', e);
            }
        }

        function updateDashboard(data) {
            const successRate = (data.success_rate * 100).toFixed(1);
            const progress = Math.min((data.total_processed / data.queue_size) * 100, 100);

            document.getElementById('content').innerHTML = `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">⚡ Throughput</div>
                        <div class="metric-value">${data.throughput.toFixed(2)}</div>
                        <div>branches/sec</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">✅ Success Rate</div>
                        <div class="metric-value">${successRate}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">💨 Processed</div>
                        <div class="metric-value">${data.total_processed}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">🔥 Active Workers</div>
                        <div class="metric-value">${data.active_workers}</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div>Progress: ${progress.toFixed(1)}% | ETA: ${data.eta_completion}s</div>
                ${data.alerts.map(alert => `<div class="alert">${alert.message}</div>`).join('')}
            `;
        }

        updateData();
        setInterval(updateData, 2000);
    </script>
</body>
</html>
EOF
}

# Main monitoring loop
monitor_loop() {
    initialize_monitor
    generate_web_dashboard

    log "🚀 Starting real-time monitoring"
    log "📊 Web dashboard: file://$DASHBOARD_FILE"
    log "📁 Metrics directory: $METRICS_DIR"

    while true; do
        collect_metrics
        calculate_predictions
        check_alerts
        display_dashboard

        sleep "$MONITOR_INTERVAL"
    done
}

# Signal handlers for graceful shutdown
cleanup() {
    log "🛑 Shutting down monitor gracefully"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Helper functions
log() { echo -e "${G}[$(date +'%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${Y}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${R}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${B}[$(date +'%H:%M:%S')] $1${NC}"; }

# Export monitoring functions
export -f collect_metrics calculate_predictions check_alerts

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ "$1" = "init" ]; then
        initialize_monitor
        generate_web_dashboard
        log "✅ Monitor initialized. Run without arguments to start monitoring."
    else
        monitor_loop
    fi
fi