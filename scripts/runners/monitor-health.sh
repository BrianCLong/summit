#!/usr/bin/env bash
# Summit Self-Hosted Runners - Health Monitoring Script
# This script monitors the health and status of all self-hosted runners

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="BrianCLong/summit"
EXPECTED_RUNNERS=5
LOG_FILE="${HOME}/.summit-runners-health.log"
ALERT_FILE="${HOME}/.summit-runners-alerts"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not installed${NC}"
        echo "Install: brew install gh (macOS) or apt install gh (Ubuntu)"
        exit 1
    fi

    if ! gh auth status &> /dev/null 2>&1; then
        echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
        echo "Run: gh auth login"
        exit 1
    fi
}

# Fetch runner data
fetch_runners() {
    gh api "repos/${REPO}/actions/runners" --jq '.runners[]'
}

# Check runner health
check_runner_health() {
    local name=$1
    local status=$2
    local busy=$3
    local os=$4
    
    if [[ "$status" == "online" ]]; then
        if [[ "$busy" == "true" ]]; then
            echo -e "  ${BLUE}▶${NC} ${name} - ${GREEN}Online${NC} (${YELLOW}Busy${NC}) [${os}]"
        else
            echo -e "  ${GREEN}✅${NC} ${name} - ${GREEN}Online${NC} (Idle) [${os}]"
        fi
        return 0
    else
        echo -e "  ${RED}❌${NC} ${name} - ${RED}Offline${NC} [${os}]"
        log "ALERT: Runner ${name} is offline"
        echo "${name}|offline|$(date)" >> "$ALERT_FILE"
        return 1
    fi
}

# Main monitoring function
monitor_runners() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}🔍 Summit Runners Health Check${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "Timestamp: $(date)"
    echo -e "Repository: ${REPO}\n"

    local total_runners=0
    local online_runners=0
    local offline_runners=0
    local busy_runners=0

    echo -e "${YELLOW}Fetching runner status...${NC}\n"

    # Get runner data
    local runners_json
    runners_json=$(gh api "repos/${REPO}/actions/runners")
    
    total_runners=$(echo "$runners_json" | jq -r '.total_count')
    
    echo -e "${BLUE}📊 Runner Status:${NC}\n"

    # Process each runner
    echo "$runners_json" | jq -c '.runners[]' | while read -r runner; do
        local name=$(echo "$runner" | jq -r '.name')
        local status=$(echo "$runner" | jq -r '.status')
        local busy=$(echo "$runner" | jq -r '.busy')
        local os=$(echo "$runner" | jq -r '.os')
        local labels=$(echo "$runner" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
        
        check_runner_health "$name" "$status" "$busy" "$os"
        
        if [[ "$status" == "online" ]]; then
            ((online_runners++))
            if [[ "$busy" == "true" ]]; then
                ((busy_runners++))
            fi
        else
            ((offline_runners++))
        fi
    done

    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}📈 Summary:${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "Total Runners:   ${total_runners}/${EXPECTED_RUNNERS}"
    echo -e "${GREEN}Online:${NC}          ${online_runners}"
    echo -e "${RED}Offline:${NC}         ${offline_runners}"
    echo -e "${YELLOW}Busy:${NC}            ${busy_runners}"
    echo -e "${BLUE}Idle:${NC}            $((online_runners - busy_runners))"

    # Health status
    echo -e "\n${BLUE}💊 Health Status:${NC}"
    if [[ $total_runners -eq $EXPECTED_RUNNERS && $offline_runners -eq 0 ]]; then
        echo -e "${GREEN}✅ All systems operational${NC}"
        log "Health check passed: All ${total_runners} runners online"
    elif [[ $offline_runners -gt 0 ]]; then
        echo -e "${RED}⚠️  WARNING: ${offline_runners} runner(s) offline${NC}"
        log "Health check warning: ${offline_runners} runners offline"
    elif [[ $total_runners -lt $EXPECTED_RUNNERS ]]; then
        echo -e "${YELLOW}⚠️  WARNING: Only ${total_runners}/${EXPECTED_RUNNERS} runners registered${NC}"
        log "Health check warning: Missing runners"
    fi

    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}📝 Quick Actions:${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "View logs:     tail -f ${LOG_FILE}"
    echo -e "View alerts:   cat ${ALERT_FILE}"
    echo -e "Test runners:  gh workflow run test-runners.yml --repo ${REPO}"
    echo -e "View GitHub:   https://github.com/${REPO}/actions/runners"
    echo -e "${BLUE}================================================${NC}\n"

    # Return exit code based on health
    if [[ $offline_runners -gt 0 || $total_runners -lt $EXPECTED_RUNNERS ]]; then
        return 1
    fi
    return 0
}

# Continuous monitoring mode
continuous_monitor() {
    local interval=${1:-60}
    echo -e "${BLUE}🔄 Starting continuous monitoring (interval: ${interval}s)${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    while true; do
        monitor_runners
        sleep "$interval"
        clear
    done
}

# Main execution
main() {
    check_prerequisites
    
    case "${1:-once}" in
        once)
            monitor_runners
            ;;
        watch)
            continuous_monitor "${2:-60}"
            ;;
        logs)
            tail -f "$LOG_FILE"
            ;;
        alerts)
            if [[ -f "$ALERT_FILE" ]]; then
                echo -e "${RED}Recent Alerts:${NC}"
                tail -20 "$ALERT_FILE"
            else
                echo -e "${GREEN}No alerts recorded${NC}"
            fi
            ;;
        clear-alerts)
            > "$ALERT_FILE"
            echo -e "${GREEN}✅ Alerts cleared${NC}"
            ;;
        help|--help|-h)
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  once              Run health check once (default)"
            echo "  watch [interval]  Continuous monitoring (default interval: 60s)"
            echo "  logs              Tail monitoring logs"
            echo "  alerts            Show recent alerts"
            echo "  clear-alerts      Clear alert history"
            echo "  help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run once"
            echo "  $0 watch 30           # Monitor every 30 seconds"
            echo "  $0 logs               # View logs"
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"
