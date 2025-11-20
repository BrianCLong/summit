#!/usr/bin/env bash
#
# Summit Demo Orchestration CLI
#
# Usage:
#   ./demos/cli.sh misinfo      - Run adversarial misinfo defense demo
#   ./demos/cli.sh deescalation - Run de-escalation coaching demo
#   ./demos/cli.sh --help       - Show help
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Banner
show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║       Summit Platform - Demo Orchestration            ║"
    echo "║       Flagship Use Case Demonstrations                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
}

# Help
show_help() {
    show_banner
    echo "Usage: $0 [DEMO_NAME]"
    echo ""
    echo "Available Demos:"
    echo "  misinfo        Adversarial Misinformation Defense"
    echo "  deescalation   De-escalation Coaching"
    echo ""
    echo "Options:"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 misinfo"
    echo "  $0 deescalation"
    echo ""
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    log_success "Python 3: $(python3 --version)"

    # Check Node.js (for UI components)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found - UI components may not be available"
    else
        log_success "Node.js: $(node --version)"
    fi

    # Check if in project root
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "Must be run from Summit project root"
        exit 1
    fi
}

# Run misinfo defense demo
run_misinfo_demo() {
    log_info "Starting Adversarial Misinformation Defense Demo"
    echo ""

    # Step 1: Load and analyze data
    log_info "Step 1/4: Loading and analyzing demo data..."
    cd "$SCRIPT_DIR/misinfo-defense/pipelines"
    python3 load_demo_data.py
    log_success "Data analysis complete"
    echo ""

    # Step 2: Check for UI
    log_info "Step 2/4: Checking UI availability..."
    if [ -f "$PROJECT_ROOT/conductor-ui/frontend/src/App.tsx" ]; then
        log_success "Conductor UI is available"
        log_info "To view results in UI, run:"
        echo "  cd conductor-ui/frontend && npm run dev"
    else
        log_warning "Conductor UI not found - results available in JSON only"
    fi
    echo ""

    # Step 3: Display results summary
    log_info "Step 3/4: Displaying results summary..."
    RESULTS_FILE="$SCRIPT_DIR/misinfo-defense/output/analysis_results.json"
    if [ -f "$RESULTS_FILE" ]; then
        log_success "Results saved to: $RESULTS_FILE"

        # Extract summary using Python
        python3 -c "
import json
with open('$RESULTS_FILE') as f:
    data = json.load(f)
    print(f\"  Total posts analyzed: {data['total_posts']}\")
    print(f\"  Misinformation detected: {data['misinfo_detected']}\")
    print(f\"  Legitimate content: {data['legitimate_content']}\")
    print(f\"  Detection rate: {data['detection_rate']:.1%}\")
"
    fi
    echo ""

    # Step 4: Copilot demo
    log_info "Step 4/4: Copilot capabilities available"
    log_info "Copilot can explain:"
    echo "  - Why content was flagged"
    echo "  - Deepfake detection methodology"
    echo "  - Fact-checking suggestions"
    echo "  - Narrative context"
    log_info "See: demos/misinfo-defense/copilot/prompts.json"
    echo ""

    log_success "✨ Adversarial Misinfo Defense Demo Complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. Review results in: $RESULTS_FILE"
    echo "  2. See demo script: demos/scripts/misinfo-demo-script.md"
    echo "  3. Run UI: cd conductor-ui/frontend && npm run dev"
    echo ""
}

# Run de-escalation demo
run_deescalation_demo() {
    log_info "Starting De-escalation Coaching Demo"
    echo ""

    # Check if de-escalation service is running
    log_info "Checking if de-escalation service is running..."
    if curl -s http://localhost:8000/healthz &> /dev/null; then
        log_success "De-escalation Coach API is running"
        USE_API=true
    else
        log_warning "De-escalation Coach API not running - using mock analysis"
        log_info "To start API: cd deescalation-coach && uvicorn app.main:app"
        USE_API=false
    fi
    echo ""

    # Step 1: Load and analyze data
    log_info "Step 1/4: Loading and analyzing demo conversations..."
    cd "$SCRIPT_DIR/deescalation/pipelines"
    python3 load_demo_data.py
    log_success "Conversation analysis complete"
    echo ""

    # Step 2: Check for UI
    log_info "Step 2/4: Checking UI availability..."
    if [ -f "$PROJECT_ROOT/conductor-ui/frontend/src/App.tsx" ]; then
        log_success "Conductor UI is available"
        log_info "To view results in UI, run:"
        echo "  cd conductor-ui/frontend && npm run dev"
    else
        log_warning "Conductor UI not found - results available in JSON only"
    fi
    echo ""

    # Step 3: Display results summary
    log_info "Step 3/4: Displaying results summary..."
    RESULTS_FILE="$SCRIPT_DIR/deescalation/output/analysis_results.json"
    if [ -f "$RESULTS_FILE" ]; then
        log_success "Results saved to: $RESULTS_FILE"

        # Extract summary using Python
        python3 -c "
import json
with open('$RESULTS_FILE') as f:
    data = json.load(f)
    print(f\"  Total conversations: {data['total_conversations']}\")
    print(f\"  Average toxicity: {data['avg_toxicity']:.2f}\")
    print(f\"  Risk distribution:\")
    for risk, count in data['risk_distribution'].items():
        print(f\"    {risk}: {count}\")
"
    fi
    echo ""

    # Step 4: Copilot demo
    log_info "Step 4/4: Copilot coaching capabilities"
    log_info "Copilot can provide:"
    echo "  - Tone and emotion analysis explanations"
    echo "  - De-escalation strategy coaching"
    echo "  - Rewrite suggestions with rationale"
    echo "  - Scenario-specific guidance"
    log_info "See: demos/deescalation/copilot/prompts.json"
    echo ""

    log_success "✨ De-escalation Coaching Demo Complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. Review results in: $RESULTS_FILE"
    echo "  2. See demo script: demos/scripts/deescalation-demo-script.md"
    echo "  3. Run UI: cd conductor-ui/frontend && npm run dev"
    if [ "$USE_API" = false ]; then
        echo "  4. Start API for live analysis: cd deescalation-coach && uvicorn app.main:app"
    fi
    echo ""
}

# Main
main() {
    show_banner

    if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi

    check_dependencies

    case "$1" in
        misinfo)
            run_misinfo_demo
            ;;
        deescalation)
            run_deescalation_demo
            ;;
        *)
            log_error "Unknown demo: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
