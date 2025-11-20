#!/usr/bin/env bash
# ==============================================================================
# Resilience Lab Chaos Runner
# ==============================================================================
# Executes chaos engineering scenarios and records recovery metrics.
# Supports Docker Compose and Kubernetes targets with comprehensive error handling.
#
# Usage:
#   ./runner.sh [OPTIONS]
#
# Environment Variables:
#   TARGET              Target environment: compose, kubernetes (default: compose)
#   SCENARIO            Specific scenario ID to run
#   SUITE               Test suite name (default: smoke_suite)
#   DRY_RUN             Dry run mode: true/false (default: false)
#   VERBOSE             Verbose output: true/false (default: false)
#   PROMETHEUS_URL      Prometheus endpoint for metrics
#   MAX_RECOVERY_TIME   Maximum recovery time in seconds (default: 300)
#
# Exit Codes:
#   0  - Success
#   1  - General error
#   2  - Missing dependencies
#   3  - Invalid configuration
#   4  - Scenario execution failed
#   5  - Recovery timeout
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

# ==============================================================================
# Configuration and Constants
# ==============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly SCENARIOS_FILE="${SCRIPT_DIR}/scenarios.yaml"
readonly REPORTS_DIR="${PROJECT_ROOT}/artifacts/chaos/reports"
readonly TEMP_DIR="${PROJECT_ROOT}/artifacts/chaos/temp"
readonly LOCK_FILE="${TEMP_DIR}/chaos-runner.lock"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration with defaults
TARGET="${TARGET:-compose}"
SCENARIO="${SCENARIO:-}"
SUITE="${SUITE:-smoke_suite}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"
MAX_RECOVERY_TIME="${MAX_RECOVERY_TIME:-300}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:4000/health}"

# Runtime state
CLEANUP_NEEDED=false
CURRENT_SCENARIO=""
TRAP_SET=false

# ==============================================================================
# Logging Functions
# ==============================================================================

# Log informational message
# Args: message string
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Log success message
# Args: message string
log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Log warning message
# Args: message string
log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Log error message
# Args: message string
log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Log debug message (only if VERBOSE=true)
# Args: message string
log_debug() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
    fi
}

# ==============================================================================
# Error Handling and Cleanup
# ==============================================================================

# Cleanup function called on script exit
# Removes lock files and performs any necessary cleanup
cleanup() {
    local exit_code=$?

    if [ "$CLEANUP_NEEDED" = "true" ]; then
        log_info "Performing cleanup..."

        # Remove lock file
        if [ -f "$LOCK_FILE" ]; then
            rm -f "$LOCK_FILE" 2>/dev/null || true
        fi

        # Additional cleanup based on target
        if [ -n "$CURRENT_SCENARIO" ]; then
            log_debug "Cleaning up scenario: $CURRENT_SCENARIO"
            # Add scenario-specific cleanup here if needed
        fi
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "Script exited with error code: $exit_code"
    fi

    exit $exit_code
}

# Set up trap for cleanup on script exit
# This ensures cleanup runs even on errors or interrupts
setup_trap() {
    if [ "$TRAP_SET" = "false" ]; then
        trap cleanup EXIT INT TERM
        TRAP_SET=true
        CLEANUP_NEEDED=true
    fi
}

# Handle errors with context
# Args: error message, exit code (default: 1)
die() {
    local message="$1"
    local exit_code="${2:-1}"

    log_error "$message"
    exit "$exit_code"
}

# ==============================================================================
# Validation Functions
# ==============================================================================

# Check if all required dependencies are installed
# Returns: 0 if all dependencies found, 2 otherwise
check_dependencies() {
    log_debug "Checking dependencies for target: $TARGET"

    local missing_deps=()

    # Target-specific dependencies
    if [ "$TARGET" = "compose" ]; then
        if ! command -v docker >/dev/null 2>&1; then
            missing_deps+=("docker")
        fi

        # Check for docker-compose or docker compose
        if ! command -v docker-compose >/dev/null 2>&1; then
            if ! docker compose version >/dev/null 2>&1; then
                missing_deps+=("docker-compose")
            fi
        fi
    elif [ "$TARGET" = "kubernetes" ] || [ "$TARGET" = "k8s" ]; then
        if ! command -v kubectl >/dev/null 2>&1; then
            missing_deps+=("kubectl")
        fi
    else
        die "Invalid TARGET: $TARGET (must be 'compose' or 'kubernetes')" 3
    fi

    # Universal dependencies
    local required_tools=("jq" "curl" "bc" "awk" "sed" "grep")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_deps+=("$tool")
        fi
    done

    # Report missing dependencies
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Install them with: sudo apt-get install ${missing_deps[*]}"
        return 2
    fi

    log_success "All dependencies satisfied"
    return 0
}

# Validate scenarios file exists and is readable
# Returns: 0 if valid, 3 otherwise
validate_scenarios_file() {
    log_debug "Validating scenarios file: $SCENARIOS_FILE"

    if [ ! -f "$SCENARIOS_FILE" ]; then
        die "Scenarios file not found: $SCENARIOS_FILE" 3
    fi

    if [ ! -r "$SCENARIOS_FILE" ]; then
        die "Scenarios file not readable: $SCENARIOS_FILE" 3
    fi

    # Basic YAML validation (check for syntax errors)
    if ! grep -q "^scenarios:" "$SCENARIOS_FILE"; then
        die "Invalid scenarios file: missing 'scenarios:' section" 3
    fi

    log_debug "Scenarios file validated"
    return 0
}

# Check if another chaos runner instance is running
# Returns: 0 if not running, 1 if already running
check_lock() {
    log_debug "Checking for existing chaos runner lock"

    if [ -f "$LOCK_FILE" ]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")

        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log_error "Another chaos runner is already running (PID: $pid)"
            log_error "If this is an error, remove: $LOCK_FILE"
            return 1
        else
            log_warn "Stale lock file found, removing it"
            rm -f "$LOCK_FILE"
        fi
    fi

    # Create lock file with current PID
    echo $$ > "$LOCK_FILE"
    log_debug "Lock acquired (PID: $$)"
    return 0
}

# Validate target environment is accessible
# Returns: 0 if accessible, 1 otherwise
validate_target_environment() {
    log_debug "Validating target environment: $TARGET"

    if [ "$TARGET" = "compose" ]; then
        # Check if Docker daemon is running
        if ! docker info >/dev/null 2>&1; then
            die "Docker daemon is not running or not accessible" 1
        fi

        # Check if compose file exists
        local compose_file="${PROJECT_ROOT}/compose/docker-compose.yml"
        if [ ! -f "$compose_file" ]; then
            log_warn "Base compose file not found: $compose_file"
        fi

    elif [ "$TARGET" = "kubernetes" ] || [ "$TARGET" = "k8s" ]; then
        # Check kubectl connectivity
        if ! kubectl cluster-info >/dev/null 2>&1; then
            die "Cannot connect to Kubernetes cluster" 1
        fi

        log_debug "Kubernetes cluster accessible"
    fi

    return 0
}

# ==============================================================================
# YAML Parsing Functions
# ==============================================================================

# Get list of scenario IDs from a test suite
# Args: suite name
# Returns: space-separated list of scenario IDs
get_scenarios_from_suite() {
    local suite=$1

    log_debug "Extracting scenarios from suite: $suite"

    # Validate suite exists
    if ! grep -q "^${suite}:" "$SCENARIOS_FILE"; then
        log_error "Suite not found: $suite"
        return 1
    fi

    # Extract scenario IDs (handles both single line and multi-line)
    local scenarios
    scenarios=$(awk "/^${suite}:/,/^[a-z_]+:/ {print}" "$SCENARIOS_FILE" | \
                grep "^  -" | \
                sed 's/^  - //' | \
                grep -v "^$" | \
                tr '\n' ' ')

    if [ -z "$scenarios" ]; then
        log_error "No scenarios found in suite: $suite"
        return 1
    fi

    log_debug "Found scenarios: $scenarios"
    echo "$scenarios"
}

# Get scenario configuration value
# Args: scenario_id, field_name
# Returns: field value or empty string
get_scenario_config() {
    local scenario_id=$1
    local field=$2

    log_debug "Getting config for scenario $scenario_id, field: $field"

    # Extract scenario block and find field
    local value
    value=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | \
            grep "    ${field}:" | \
            head -1 | \
            sed "s/.*${field}: //" | \
            tr -d '"' || echo "")

    echo "$value"
}

# Get nested configuration (e.g., compose.service)
# Args: scenario_id, parent_field, child_field
# Returns: field value or empty string
get_nested_config() {
    local scenario_id=$1
    local parent=$2
    local child=$3

    log_debug "Getting nested config: $scenario_id.$parent.$child"

    local value
    value=$(awk "/^  - id: ${scenario_id}/,/^  - id:/ {print}" "$SCENARIOS_FILE" | \
            awk "/${parent}:/,/^    [a-z_]+:/ {print}" | \
            grep "      ${child}:" | \
            head -1 | \
            awk '{print $2}' | \
            tr -d '"' || echo "")

    echo "$value"
}

# ==============================================================================
# Health Check Functions
# ==============================================================================

# Perform HTTP health check
# Args: url, expected_status (default: 200), timeout (default: 5)
# Returns: 0 if healthy, 1 otherwise
http_health_check() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-5}

    log_debug "HTTP health check: $url (expect: $expected_status, timeout: ${timeout}s)"

    # Perform curl request with error handling
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" \
             --max-time "$timeout" \
             --connect-timeout $((timeout / 2)) \
             --retry 0 \
             "$url" 2>/dev/null || echo "000")

    if [ "$status" = "$expected_status" ]; then
        log_debug "Health check passed (status: $status)"
        return 0
    else
        log_debug "Health check failed (status: $status, expected: $expected_status)"
        return 1
    fi
}

# Perform GraphQL health check
# Args: url, query (optional), timeout (default: 5)
# Returns: 0 if healthy, 1 otherwise
graphql_health_check() {
    local url=$1
    local query=${2:-'{"query": "{ __typename }"}'}
    local timeout=${3:-5}

    log_debug "GraphQL health check: $url"

    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" \
             --max-time "$timeout" \
             --connect-timeout $((timeout / 2)) \
             -H "Content-Type: application/json" \
             -d "$query" \
             "$url" 2>/dev/null || echo "000")

    if [ "$status" = "200" ]; then
        log_debug "GraphQL health check passed"
        return 0
    else
        log_debug "GraphQL health check failed (status: $status)"
        return 1
    fi
}

# Perform TCP port health check
# Args: host, port, timeout (default: 3)
# Returns: 0 if port open, 1 otherwise
tcp_health_check() {
    local host=$1
    local port=$2
    local timeout=${3:-3}

    log_debug "TCP health check: ${host}:${port}"

    if timeout "$timeout" bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>/dev/null; then
        log_debug "TCP port ${host}:${port} is open"
        return 0
    else
        log_debug "TCP port ${host}:${port} is closed or timeout"
        return 1
    fi
}

# Wait for system to become healthy with retries
# Args: health_check_url, max_attempts (default: 60), interval (default: 2)
# Returns: 0 if healthy, 1 if timeout
wait_for_health() {
    local url=$1
    local max_attempts=${2:-60}
    local interval=${3:-2}

    log_info "Waiting for system health (max ${max_attempts} attempts, ${interval}s interval)"

    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if http_health_check "$url" 200 5; then
            log_success "System is healthy after ${attempt} attempts"
            return 0
        fi

        ((attempt++))
        log_debug "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep "$interval"
    done

    log_error "System did not become healthy after ${max_attempts} attempts"
    return 1
}

# ==============================================================================
# Docker Compose Chaos Actions
# ==============================================================================

# Get docker-compose command (handles both docker-compose and docker compose)
# Returns: appropriate compose command
get_compose_command() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Execute chaos action on Docker Compose service
# Args: service_name, action, duration (optional)
# Returns: 0 if successful, 4 otherwise
compose_chaos_action() {
    local service=$1
    local action=$2
    local duration=${3:-60}

    log_info "Executing Docker Compose chaos: ${action} on service ${service} for ${duration}s"

    local compose_cmd
    compose_cmd=$(get_compose_command)
    local compose_files="-f ${PROJECT_ROOT}/compose/docker-compose.yml"

    # Add chaos compose file if it exists
    if [ -f "${PROJECT_ROOT}/compose/docker-compose.chaos.yml" ]; then
        compose_files="$compose_files -f ${PROJECT_ROOT}/compose/docker-compose.chaos.yml"
    fi

    # Validate service exists
    if ! eval "$compose_cmd $compose_files ps -q $service" >/dev/null 2>&1; then
        log_error "Service not found in compose stack: $service"
        return 4
    fi

    case "$action" in
        stop)
            if [ "$DRY_RUN" = "false" ]; then
                log_info "Stopping service: $service"
                eval "$compose_cmd $compose_files stop $service" || {
                    log_error "Failed to stop service: $service"
                    return 4
                }

                sleep "$duration"

                log_info "Starting service: $service"
                eval "$compose_cmd $compose_files start $service" || {
                    log_error "Failed to start service: $service"
                    return 4
                }
            else
                log_info "[DRY RUN] Would stop service $service for ${duration}s"
            fi
            ;;

        restart)
            if [ "$DRY_RUN" = "false" ]; then
                log_info "Restarting service: $service"
                eval "$compose_cmd $compose_files restart $service" || {
                    log_error "Failed to restart service: $service"
                    return 4
                }
            else
                log_info "[DRY RUN] Would restart service $service"
            fi
            ;;

        pause)
            if [ "$DRY_RUN" = "false" ]; then
                log_info "Pausing service: $service"
                eval "$compose_cmd $compose_files pause $service" || {
                    log_error "Failed to pause service: $service"
                    return 4
                }

                sleep "$duration"

                log_info "Unpausing service: $service"
                eval "$compose_cmd $compose_files unpause $service" || {
                    log_error "Failed to unpause service: $service"
                    return 4
                }
            else
                log_info "[DRY RUN] Would pause service $service for ${duration}s"
            fi
            ;;

        kill)
            if [ "$DRY_RUN" = "false" ]; then
                log_warn "Killing service: $service (force)"
                eval "$compose_cmd $compose_files kill $service" || {
                    log_error "Failed to kill service: $service"
                    return 4
                }

                sleep 2

                log_info "Restarting service: $service"
                eval "$compose_cmd $compose_files up -d $service" || {
                    log_error "Failed to restart service: $service"
                    return 4
                }
            else
                log_info "[DRY RUN] Would kill service $service"
            fi
            ;;

        network-delay)
            if [ "$DRY_RUN" = "false" ]; then
                local container_id
                container_id=$(eval "$compose_cmd $compose_files ps -q $service" | head -1)

                if [ -z "$container_id" ]; then
                    log_error "Cannot find container for service: $service"
                    return 4
                fi

                log_info "Adding network delay to container: $container_id"

                # Add network delay using tc (traffic control)
                if docker exec "$container_id" tc qdisc add dev eth0 root netem delay 100ms 20ms 2>/dev/null; then
                    log_success "Network delay added"
                    sleep "$duration"

                    log_info "Removing network delay"
                    docker exec "$container_id" tc qdisc del dev eth0 root 2>/dev/null || true
                else
                    log_warn "Failed to add network delay (tc command not available or requires NET_ADMIN capability)"
                    log_warn "Run compose with --privileged or add CAP_NET_ADMIN capability"
                fi
            else
                log_info "[DRY RUN] Would add network delay to $service for ${duration}s"
            fi
            ;;

        cpu-stress)
            if [ "$DRY_RUN" = "false" ]; then
                local container_id
                container_id=$(eval "$compose_cmd $compose_files ps -q $service" | head -1)

                if [ -z "$container_id" ]; then
                    log_error "Cannot find container for service: $service"
                    return 4
                fi

                log_info "Starting CPU stress on container: $container_id"

                # Start CPU stress in background
                docker exec -d "$container_id" sh -c "yes > /dev/null" 2>/dev/null || {
                    log_warn "Failed to start CPU stress (sh not available in container)"
                }

                sleep "$duration"

                log_info "Stopping CPU stress"
                docker exec "$container_id" pkill -f "yes" 2>/dev/null || true
            else
                log_info "[DRY RUN] Would apply CPU stress to $service for ${duration}s"
            fi
            ;;

        memory-stress)
            if [ "$DRY_RUN" = "false" ]; then
                local container_id
                container_id=$(eval "$compose_cmd $compose_files ps -q $service" | head -1)

                if [ -z "$container_id" ]; then
                    log_error "Cannot find container for service: $service"
                    return 4
                fi

                log_info "Starting memory stress on container: $container_id"

                # Allocate memory using dd
                docker exec -d "$container_id" sh -c \
                    "dd if=/dev/zero of=/tmp/mem bs=1M count=256 iflag=fullblock 2>/dev/null" 2>/dev/null || {
                    log_warn "Failed to start memory stress"
                }

                sleep "$duration"

                log_info "Stopping memory stress"
                docker exec "$container_id" rm -f /tmp/mem 2>/dev/null || true
            else
                log_info "[DRY RUN] Would apply memory stress to $service for ${duration}s"
            fi
            ;;

        *)
            log_error "Unknown chaos action: $action"
            log_error "Valid actions: stop, restart, pause, kill, network-delay, cpu-stress, memory-stress"
            return 4
            ;;
    esac

    log_success "Chaos action completed: $action"
    return 0
}

# ==============================================================================
# Kubernetes Chaos Actions
# ==============================================================================

# Execute chaos action on Kubernetes pods
# Args: selector, action, namespace (default: default)
# Returns: 0 if successful, 4 otherwise
k8s_chaos_action() {
    local selector=$1
    local action=$2
    local namespace=${3:-default}

    log_info "Executing Kubernetes chaos: ${action} on pods matching ${selector} in namespace ${namespace}"

    # Validate namespace exists
    if ! kubectl get namespace "$namespace" >/dev/null 2>&1; then
        log_error "Namespace not found: $namespace"
        return 4
    fi

    # Validate pods exist
    local pod_count
    pod_count=$(kubectl get pods -n "$namespace" -l "$selector" --no-headers 2>/dev/null | wc -l)

    if [ "$pod_count" -eq 0 ]; then
        log_error "No pods found matching selector: $selector"
        return 4
    fi

    log_debug "Found $pod_count pod(s) matching selector"

    case "$action" in
        delete-pod)
            if [ "$DRY_RUN" = "false" ]; then
                log_info "Deleting pod(s) matching: $selector"

                # Delete pods (will trigger recreation if part of deployment/statefulset)
                if kubectl delete pod -n "$namespace" -l "$selector" --wait=false 2>&1 | tee /tmp/k8s-chaos.log; then
                    log_success "Pod deletion initiated"
                else
                    log_error "Failed to delete pods"
                    cat /tmp/k8s-chaos.log
                    return 4
                fi
            else
                log_info "[DRY RUN] Would delete pods matching $selector in $namespace"
            fi
            ;;

        drain-node)
            log_warn "drain-node action requires additional safety checks"
            if [ "$DRY_RUN" = "false" ]; then
                log_error "drain-node not implemented in this version for safety"
                return 4
            else
                log_info "[DRY RUN] Would drain node for pods matching $selector"
            fi
            ;;

        *)
            log_error "Unknown Kubernetes chaos action: $action"
            log_error "Valid actions: delete-pod"
            return 4
            ;;
    esac

    return 0
}

# ==============================================================================
# Recovery and Metrics Functions
# ==============================================================================

# Measure system recovery time
# Args: health_check_url, max_wait (default: 300), check_interval (default: 2)
# Returns: recovery time in seconds, or -1 if timeout
measure_recovery() {
    local health_check_url=$1
    local max_wait=${2:-$MAX_RECOVERY_TIME}
    local check_interval=${3:-2}

    log_info "Measuring system recovery (max wait: ${max_wait}s, interval: ${check_interval}s)"

    local start_time
    start_time=$(date +%s)
    local elapsed=0
    local consecutive_success=0
    local required_success=3  # Require 3 consecutive successes to confirm recovery

    while [ $elapsed -lt $max_wait ]; do
        if http_health_check "$health_check_url" 200 5; then
            ((consecutive_success++))
            log_debug "Health check passed ($consecutive_success/$required_success)"

            if [ $consecutive_success -ge $required_success ]; then
                local end_time
                end_time=$(date +%s)
                local recovery_time=$((end_time - start_time))
                log_success "System recovered in ${recovery_time}s (after $required_success consecutive successes)"
                echo "$recovery_time"
                return 0
            fi
        else
            if [ $consecutive_success -gt 0 ]; then
                log_debug "Health check failed after $consecutive_success successes, resetting counter"
            fi
            consecutive_success=0
        fi

        sleep "$check_interval"
        elapsed=$((elapsed + check_interval))

        # Progress indicator every 30 seconds
        if [ $((elapsed % 30)) -eq 0 ]; then
            log_info "Still waiting for recovery... (${elapsed}s / ${max_wait}s)"
        fi
    done

    log_error "System did not recover within ${max_wait}s"
    echo "-1"
    return 5
}

# Collect Prometheus metrics for chaos window
# Args: scenario_id, start_time, end_time, output_file
# Returns: 0 if successful, 1 if Prometheus unavailable
collect_prometheus_metrics() {
    local scenario_id=$1
    local start_time=$2
    local end_time=$3
    local output_file=$4

    log_debug "Collecting Prometheus metrics for scenario: $scenario_id"

    # Check if Prometheus is available
    if ! http_health_check "${PROMETHEUS_URL}/-/healthy" 200 2; then
        log_warn "Prometheus not available at $PROMETHEUS_URL, skipping metrics collection"
        return 1
    fi

    log_info "Collecting metrics from Prometheus ($start_time to $end_time)"

    # Query for error rate during chaos window
    local error_rate_query='sum(rate(http_requests_total{code!~"2.."}[1m])) / sum(rate(http_requests_total[1m]))'
    if curl -s -G "${PROMETHEUS_URL}/api/v1/query_range" \
        --data-urlencode "query=$error_rate_query" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=5s" \
        -o "${output_file}.error_rate.json" 2>/dev/null; then
        log_debug "Error rate metrics collected"
    else
        log_warn "Failed to collect error rate metrics"
    fi

    # Query for P95 latency during chaos window
    local latency_query='histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[1m])) by (le))'
    if curl -s -G "${PROMETHEUS_URL}/api/v1/query_range" \
        --data-urlencode "query=$latency_query" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=5s" \
        -o "${output_file}.latency_p95.json" 2>/dev/null; then
        log_debug "Latency metrics collected"
    else
        log_warn "Failed to collect latency metrics"
    fi

    # Query for availability during chaos window
    local availability_query='avg_over_time(up{job="intelgraph-server"}[1m])'
    if curl -s -G "${PROMETHEUS_URL}/api/v1/query_range" \
        --data-urlencode "query=$availability_query" \
        --data-urlencode "start=$start_time" \
        --data-urlencode "end=$end_time" \
        --data-urlencode "step=5s" \
        -o "${output_file}.availability.json" 2>/dev/null; then
        log_debug "Availability metrics collected"
    else
        log_warn "Failed to collect availability metrics"
    fi

    log_success "Prometheus metrics collection completed"
    return 0
}

# Calculate aggregated metrics from Prometheus results
# Args: output_file_prefix
# Returns: JSON object with aggregated metrics
aggregate_metrics() {
    local output_prefix=$1

    log_debug "Aggregating metrics from: $output_prefix"

    local metrics="{}"

    # Calculate average error rate
    if [ -f "${output_prefix}.error_rate.json" ]; then
        local avg_error_rate
        avg_error_rate=$(jq -r '.data.result[0].values | map(.[1] | tonumber) | add / length' \
                         "${output_prefix}.error_rate.json" 2>/dev/null || echo "0")
        metrics=$(echo "$metrics" | jq --arg rate "$avg_error_rate" '. + {avg_error_rate: ($rate | tonumber)}')
    fi

    # Calculate max P95 latency
    if [ -f "${output_prefix}.latency_p95.json" ]; then
        local max_latency
        max_latency=$(jq -r '.data.result[0].values | map(.[1] | tonumber) | max' \
                      "${output_prefix}.latency_p95.json" 2>/dev/null || echo "0")
        metrics=$(echo "$metrics" | jq --arg lat "$max_latency" '. + {max_p95_latency: ($lat | tonumber)}')
    fi

    # Calculate minimum availability
    if [ -f "${output_prefix}.availability.json" ]; then
        local min_availability
        min_availability=$(jq -r '.data.result[0].values | map(.[1] | tonumber) | min' \
                           "${output_prefix}.availability.json" 2>/dev/null || echo "1")
        metrics=$(echo "$metrics" | jq --arg avail "$min_availability" '. + {min_availability: ($avail | tonumber)}')
    fi

    echo "$metrics"
}

# ==============================================================================
# Scenario Execution
# ==============================================================================

# Run a single chaos scenario
# Args: scenario_id
# Returns: path to report file
run_scenario() {
    local scenario_id=$1
    CURRENT_SCENARIO="$scenario_id"

    log_info "========================================="
    log_info "Running chaos scenario: ${scenario_id}"
    log_info "========================================="

    # Extract scenario configuration
    local scenario_name
    scenario_name=$(get_scenario_config "$scenario_id" "name")

    if [ -z "$scenario_name" ]; then
        log_error "Scenario not found: $scenario_id"
        return 4
    fi

    log_info "Scenario: $scenario_name"

    # Generate report file path
    local start_timestamp
    start_timestamp=$(date +%s)
    local report_file="${REPORTS_DIR}/${scenario_id}_$(date +%Y%m%d_%H%M%S).json"

    # Initialize report with comprehensive metadata
    cat > "$report_file" <<EOF
{
  "scenario_id": "$scenario_id",
  "scenario_name": "$scenario_name",
  "target": "$TARGET",
  "start_time": $start_timestamp,
  "start_time_human": "$(date -d @$start_timestamp 2>/dev/null || date -r $start_timestamp 2>/dev/null || date)",
  "hostname": "$(hostname)",
  "runner_version": "2.0",
  "dry_run": $DRY_RUN,
  "status": "running",
  "metrics": {},
  "chaos_actions": [],
  "health_checks": [],
  "errors": []
}
EOF

    # Pre-chaos health check with retries
    log_info "Pre-chaos health check..."
    local health_url="$HEALTH_CHECK_URL"

    if ! wait_for_health "$health_url" 10 2; then
        log_error "System unhealthy before chaos - aborting scenario"
        jq --arg reason "Pre-chaos health check failed" \
           '.status = "aborted" | .errors += [$reason]' \
           "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
        echo "$report_file"
        return 4
    fi

    log_success "System healthy, proceeding with chaos"

    # Record health check success
    jq '.health_checks += [{time: now, type: "pre-chaos", status: "passed"}]' \
       "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"

    # Execute chaos based on target
    local chaos_start
    chaos_start=$(date +%s)

    local chaos_failed=false

    if [ "$TARGET" = "compose" ]; then
        # Extract Docker Compose configuration
        local service
        service=$(get_nested_config "$scenario_id" "compose" "service")
        local action
        action=$(get_nested_config "$scenario_id" "compose" "action")
        local duration
        duration=$(get_nested_config "$scenario_id" "compose" "duration")
        duration=${duration:-60}

        log_debug "Compose chaos: service=$service, action=$action, duration=$duration"

        if [ -z "$service" ] || [ -z "$action" ]; then
            log_error "Invalid or missing compose configuration for scenario $scenario_id"
            jq --arg reason "Invalid compose configuration" \
               '.status = "failed" | .errors += [$reason]' \
               "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
            chaos_failed=true
        else
            # Execute compose chaos action
            if ! compose_chaos_action "$service" "$action" "$duration"; then
                log_error "Compose chaos action failed"
                jq --arg reason "Compose chaos action failed" \
                   '.status = "failed" | .errors += [$reason]' \
                   "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
                chaos_failed=true
            else
                # Record chaos action in report
                jq --arg service "$service" --arg action "$action" --arg duration "$duration" \
                   '.chaos_actions += [{service: $service, action: $action, duration: ($duration | tonumber), time: now}]' \
                   "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
            fi
        fi

    elif [ "$TARGET" = "kubernetes" ] || [ "$TARGET" = "k8s" ]; then
        # Extract Kubernetes configuration
        local selector
        selector=$(get_nested_config "$scenario_id" "kubernetes" "selector")
        local action
        action=$(get_nested_config "$scenario_id" "kubernetes" "action")
        local namespace
        namespace=$(get_nested_config "$scenario_id" "kubernetes" "namespace")
        namespace=${namespace:-default}

        log_debug "K8s chaos: selector=$selector, action=$action, namespace=$namespace"

        if [ -z "$selector" ] || [ -z "$action" ]; then
            log_error "Invalid or missing kubernetes configuration for scenario $scenario_id"
            jq --arg reason "Invalid kubernetes configuration" \
               '.status = "failed" | .errors += [$reason]' \
               "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
            chaos_failed=true
        else
            # Execute k8s chaos action
            if ! k8s_chaos_action "$selector" "$action" "$namespace"; then
                log_error "Kubernetes chaos action failed"
                jq --arg reason "Kubernetes chaos action failed" \
                   '.status = "failed" | .errors += [$reason]' \
                   "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
                chaos_failed=true
            else
                # Record chaos action in report
                jq --arg selector "$selector" --arg action "$action" --arg namespace "$namespace" \
                   '.chaos_actions += [{selector: $selector, action: $action, namespace: $namespace, time: now}]' \
                   "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
            fi
        fi
    fi

    local chaos_end
    chaos_end=$(date +%s)
    local chaos_duration=$((chaos_end - chaos_start))

    # If chaos action failed, skip recovery measurement
    if [ "$chaos_failed" = "true" ]; then
        log_error "Chaos action failed, skipping recovery measurement"
        echo "$report_file"
        return 4
    fi

    # Brief pause after chaos to let system start recovery
    log_debug "Waiting 2s before measuring recovery..."
    sleep 2

    # Measure recovery time
    log_info "Measuring system recovery..."
    local recovery_time
    recovery_time=$(measure_recovery "$health_url" "$MAX_RECOVERY_TIME" 2)

    local recovery_status
    if [ "$recovery_time" = "-1" ]; then
        recovery_status="timeout"
        log_error "Recovery timeout exceeded"
    else
        recovery_status="recovered"
        log_success "System recovered in ${recovery_time}s"
    fi

    # Post-chaos validation
    log_info "Post-chaos health validation..."
    if wait_for_health "$health_url" 5 2; then
        log_success "Post-chaos health check passed"
        jq '.health_checks += [{time: now, type: "post-chaos", status: "passed"}]' \
           "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
    else
        log_warn "Post-chaos health check failed"
        jq '.health_checks += [{time: now, type: "post-chaos", status: "failed"}]' \
           "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"
    fi

    local end_timestamp
    end_timestamp=$(date +%s)
    local total_duration=$((end_timestamp - start_timestamp))

    # Collect Prometheus metrics if available
    local metrics_file="${TEMP_DIR}/${scenario_id}_$(date +%s)"
    collect_prometheus_metrics "$scenario_id" "$chaos_start" "$end_timestamp" "$metrics_file" || true

    # Aggregate additional metrics
    local additional_metrics
    additional_metrics=$(aggregate_metrics "$metrics_file")

    # Determine pass/fail based on SLO
    # Extract SLO from scenarios file
    local slo_recovery_time
    slo_recovery_time=$(grep "recovery_time_seconds:" "$SCENARIOS_FILE" | awk '{print $2}')
    slo_recovery_time=${slo_recovery_time:-30}

    local status="pass"
    local failure_reasons=()

    if [ "$recovery_time" = "-1" ]; then
        status="fail"
        failure_reasons+=("Recovery timeout exceeded (>${MAX_RECOVERY_TIME}s)")
    elif [ "$recovery_time" -gt "$slo_recovery_time" ]; then
        status="fail"
        failure_reasons+=("Recovery time ${recovery_time}s exceeds SLO ${slo_recovery_time}s")
    fi

    # Check additional metrics against SLOs
    local avg_error_rate
    avg_error_rate=$(echo "$additional_metrics" | jq -r '.avg_error_rate // 0')
    if [ "$(echo "$avg_error_rate > 0.05" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        status="fail"
        failure_reasons+=("Error rate $(echo "$avg_error_rate * 100" | bc -l | cut -d. -f1)% exceeds SLO 5%")
    fi

    # Update final report with all metrics and status
    jq --arg status "$status" \
       --arg recovery_time "$recovery_time" \
       --arg recovery_status "$recovery_status" \
       --arg end_time "$end_timestamp" \
       --arg end_time_human "$(date -d @$end_timestamp 2>/dev/null || date -r $end_timestamp 2>/dev/null || date)" \
       --arg total_duration "$total_duration" \
       --arg chaos_duration "$chaos_duration" \
       --argjson additional_metrics "$additional_metrics" \
       --argjson failure_reasons "$(printf '%s\n' "${failure_reasons[@]}" | jq -R . | jq -s .)" \
       '.status = $status |
        .end_time = ($end_time | tonumber) |
        .end_time_human = $end_time_human |
        .total_duration_seconds = ($total_duration | tonumber) |
        .chaos_duration_seconds = ($chaos_duration | tonumber) |
        .recovery_status = $recovery_status |
        .metrics.recovery_time_seconds = ($recovery_time | tonumber) |
        .metrics += $additional_metrics |
        .failure_reasons = $failure_reasons' \
       "$report_file" > "${report_file}.tmp" && mv "${report_file}.tmp" "$report_file"

    # Log final status
    if [ "$status" = "pass" ]; then
        log_success "Scenario ${scenario_id}: PASSED (recovered in ${recovery_time}s)"
    else
        log_error "Scenario ${scenario_id}: FAILED"
        for reason in "${failure_reasons[@]}"; do
            log_error "  - $reason"
        done
    fi

    echo "$report_file"
}

# Run a test suite (multiple scenarios)
# Args: suite name
# Returns: 0 if all pass, 4 if any fail
run_suite() {
    local suite=$1

    log_info "========================================="
    log_info "Running chaos test suite: ${suite}"
    log_info "========================================="

    # Get scenarios from suite
    local scenarios
    scenarios=$(get_scenarios_from_suite "$suite")

    if [ -z "$scenarios" ]; then
        log_error "No scenarios found in suite: $suite"
        return 4
    fi

    log_info "Suite contains scenarios: $scenarios"

    # Initialize suite report
    local suite_report="${REPORTS_DIR}/suite_${suite}_$(date +%Y%m%d_%H%M%S).json"
    cat > "$suite_report" <<EOF
{
  "suite": "$suite",
  "target": "$TARGET",
  "start_time": $(date +%s),
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "dry_run": $DRY_RUN,
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "aborted": 0
  },
  "scenarios": []
}
EOF

    local scenario_reports=()
    local passed=0
    local failed=0
    local aborted=0
    local total=0

    # Run each scenario
    for scenario in $scenarios; do
        ((total++))

        log_info ""
        log_info "Starting scenario $total: $scenario"
        log_info ""

        local report
        if report=$(run_scenario "$scenario"); then
            scenario_reports+=("$report")

            # Check scenario status
            local status
            status=$(jq -r '.status' "$report")

            case "$status" in
                pass)
                    ((passed++))
                    ;;
                fail)
                    ((failed++))
                    ;;
                aborted)
                    ((aborted++))
                    ;;
            esac
        else
            log_error "Scenario execution failed: $scenario"
            ((failed++))
        fi

        # Brief pause between scenarios to allow system to stabilize
        if [ $total -lt $(echo "$scenarios" | wc -w) ]; then
            log_info "Pausing 10s before next scenario..."
            sleep 10
        fi
    done

    # Update suite summary
    jq --arg total "$total" \
       --arg passed "$passed" \
       --arg failed "$failed" \
       --arg aborted "$aborted" \
       --arg end_time "$(date +%s)" \
       '.summary.total = ($total | tonumber) |
        .summary.passed = ($passed | tonumber) |
        .summary.failed = ($failed | tonumber) |
        .summary.aborted = ($aborted | tonumber) |
        .end_time = ($end_time | tonumber)' \
       "$suite_report" > "${suite_report}.tmp" && mv "${suite_report}.tmp" "$suite_report"

    # Aggregate individual scenario reports into suite report
    for report in "${scenario_reports[@]}"; do
        if [ -f "$report" ]; then
            local content
            content=$(cat "$report")
            jq --argjson scenario "$content" \
               '.scenarios += [$scenario]' \
               "$suite_report" > "${suite_report}.tmp" && mv "${suite_report}.tmp" "$suite_report"
        fi
    done

    # Log suite results
    log_info ""
    log_info "========================================="
    log_info "Suite Results"
    log_info "========================================="
    log_info "Total scenarios:   $total"
    log_success "Passed:            $passed"
    if [ $failed -gt 0 ]; then
        log_error "Failed:            $failed"
    else
        log_info "Failed:            $failed"
    fi
    if [ $aborted -gt 0 ]; then
        log_warn "Aborted:           $aborted"
    fi
    log_info "Report: ${suite_report}"
    log_info "========================================="

    # Return success only if all passed
    if [ $failed -eq 0 ] && [ $aborted -eq 0 ]; then
        return 0
    else
        return 4
    fi
}

# ==============================================================================
# Report Generation
# ==============================================================================

# Generate HTML report from JSON report
# Args: json_report_path
# Returns: 0 if successful
generate_html_report() {
    local json_report=$1
    local html_report="${json_report%.json}.html"

    log_info "Generating HTML report: ${html_report}"

    if [ ! -f "$json_report" ]; then
        log_error "JSON report not found: $json_report"
        return 1
    fi

    # Generate HTML report with embedded JSON data
    cat > "$html_report" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chaos Engineering Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        h2 {
            color: #555;
            margin: 30px 0 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        h3 {
            color: #666;
            margin: 20px 0 10px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
        }
        .title { flex: 1; }
        .subtitle {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .metric:hover {
            transform: translateY(-5px);
        }
        .metric h3 {
            font-size: 0.9em;
            color: #666;
            margin: 0 0 10px;
        }
        .metric .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }
        .metric.pass {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border-left: 4px solid #28a745;
        }
        .metric.pass .value { color: #28a745; }
        .metric.fail {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border-left: 4px solid #dc3545;
        }
        .metric.fail .value { color: #dc3545; }
        .metric.warn {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
            border-left: 4px solid #ffc107;
        }
        .metric.warn .value { color: #ffc107; }
        .scenario {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        }
        .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .scenario h3 {
            margin: 0;
            flex: 1;
        }
        .status {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status.pass {
            background: #28a745;
            color: white;
        }
        .status.fail {
            background: #dc3545;
            color: white;
        }
        .status.aborted {
            background: #ffc107;
            color: #333;
        }
        .status.running {
            background: #17a2b8;
            color: white;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .details {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .error-list {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .error-list ul {
            margin-left: 20px;
        }
        .error-list li {
            color: #856404;
            margin: 5px 0;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            font-family: 'Courier New', monospace;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            margin-right: 8px;
        }
        .badge.compose {
            background: #007bff;
            color: white;
        }
        .badge.kubernetes {
            background: #326ce5;
            color: white;
        }
        .badge.dry-run {
            background: #6c757d;
            color: white;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">
                <h1>🔥 Resilience Lab</h1>
                <div class="subtitle">Chaos Engineering Report</div>
            </div>
        </div>
        <div id="report"></div>
    </div>
    <script>
HTMLEOF

    # Embed JSON data
    echo "const reportData = " >> "$html_report"
    cat "$json_report" >> "$html_report"
    echo ";" >> "$html_report"

    # Add JavaScript rendering logic
    cat >> "$html_report" <<'JSEOF'

        const container = document.getElementById('report');

        function formatDuration(seconds) {
            if (seconds < 0) return 'timeout';
            if (seconds < 60) return seconds + 's';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins + 'm ' + secs + 's';
        }

        function formatTimestamp(ts) {
            return new Date(ts * 1000).toLocaleString();
        }

        function renderSuiteReport(data) {
            const badges = [];
            badges.push(`<span class="badge ${data.target}">${data.target}</span>`);
            if (data.dry_run) badges.push('<span class="badge dry-run">DRY RUN</span>');

            let html = `
                <div class="details">
                    <p><strong>Suite:</strong> ${data.suite} ${badges.join(' ')}</p>
                    <p><strong>Started:</strong> <span class="timestamp">${data.timestamp}</span></p>
                    <p><strong>Hostname:</strong> ${data.hostname || 'unknown'}</p>
                </div>

                <h2>Summary</h2>
                <div class="summary">
                    <div class="metric">
                        <h3>Total Scenarios</h3>
                        <div class="value">${data.summary.total}</div>
                    </div>
                    <div class="metric pass">
                        <h3>Passed</h3>
                        <div class="value">${data.summary.passed}</div>
                    </div>
                    <div class="metric fail">
                        <h3>Failed</h3>
                        <div class="value">${data.summary.failed}</div>
                    </div>
                    ${data.summary.aborted > 0 ? `
                    <div class="metric warn">
                        <h3>Aborted</h3>
                        <div class="value">${data.summary.aborted}</div>
                    </div>
                    ` : ''}
                </div>

                <h2>Scenarios</h2>
            `;

            data.scenarios.forEach(scenario => {
                html += renderScenario(scenario);
            });

            container.innerHTML = html;
        }

        function renderScenario(scenario) {
            const badges = [];
            badges.push(`<span class="badge ${scenario.target}">${scenario.target}</span>`);
            if (scenario.dry_run) badges.push('<span class="badge dry-run">DRY RUN</span>');

            let html = `
                <div class="scenario">
                    <div class="scenario-header">
                        <h3>${scenario.scenario_name}</h3>
                        <span class="status ${scenario.status}">${scenario.status}</span>
                    </div>
                    <p><strong>ID:</strong> ${scenario.scenario_id} ${badges.join(' ')}</p>
                    <table>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                        <tr>
                            <td>Recovery Time</td>
                            <td><strong>${formatDuration(scenario.metrics.recovery_time_seconds)}</strong></td>
                        </tr>
                        <tr>
                            <td>Total Duration</td>
                            <td>${formatDuration(scenario.total_duration_seconds)}</td>
                        </tr>
                        ${scenario.chaos_duration_seconds ? `
                        <tr>
                            <td>Chaos Duration</td>
                            <td>${formatDuration(scenario.chaos_duration_seconds)}</td>
                        </tr>
                        ` : ''}
                        ${scenario.metrics.avg_error_rate !== undefined ? `
                        <tr>
                            <td>Avg Error Rate</td>
                            <td>${(scenario.metrics.avg_error_rate * 100).toFixed(2)}%</td>
                        </tr>
                        ` : ''}
                        ${scenario.metrics.max_p95_latency !== undefined ? `
                        <tr>
                            <td>Max P95 Latency</td>
                            <td>${(scenario.metrics.max_p95_latency * 1000).toFixed(0)}ms</td>
                        </tr>
                        ` : ''}
                        ${scenario.metrics.min_availability !== undefined ? `
                        <tr>
                            <td>Min Availability</td>
                            <td>${(scenario.metrics.min_availability * 100).toFixed(1)}%</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td>Start Time</td>
                            <td class="timestamp">${scenario.start_time_human}</td>
                        </tr>
                        <tr>
                            <td>End Time</td>
                            <td class="timestamp">${scenario.end_time_human || 'In progress'}</td>
                        </tr>
                    </table>
            `;

            if (scenario.failure_reasons && scenario.failure_reasons.length > 0) {
                html += `
                    <div class="error-list">
                        <strong>Failure Reasons:</strong>
                        <ul>
                            ${scenario.failure_reasons.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            if (scenario.errors && scenario.errors.length > 0) {
                html += `
                    <div class="error-list">
                        <strong>Errors:</strong>
                        <ul>
                            ${scenario.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            html += '</div>';
            return html;
        }

        function renderSingleScenario(data) {
            const badges = [];
            badges.push(`<span class="badge ${data.target}">${data.target}</span>`);
            if (data.dry_run) badges.push('<span class="badge dry-run">DRY RUN</span>');

            let html = `
                <div class="details">
                    <h2>${data.scenario_name}</h2>
                    <p><strong>ID:</strong> ${data.scenario_id} ${badges.join(' ')}</p>
                    <p><strong>Status:</strong> <span class="status ${data.status}">${data.status}</span></p>
                </div>
            `;

            html += renderScenario(data);
            container.innerHTML = html;
        }

        // Render appropriate report type
        if (reportData.suite) {
            renderSuiteReport(reportData);
        } else {
            renderSingleScenario(reportData);
        }
    </script>
</body>
</html>
JSEOF

    log_success "HTML report generated: ${html_report}"
    return 0
}

# ==============================================================================
# Main Execution
# ==============================================================================

# Display usage information
usage() {
    cat <<EOF
Resilience Lab Chaos Runner v2.0

Usage: $0 [OPTIONS]

Options:
    -t, --target TARGET      Target environment: compose or kubernetes (default: compose)
    -s, --scenario ID        Run specific scenario by ID
    -u, --suite SUITE        Run test suite (default: smoke_suite)
    -d, --dry-run            Dry run mode - don't execute actual chaos
    -v, --verbose            Verbose output with debug logs
    -h, --help               Show this help message

Environment Variables:
    TARGET               Target environment (compose, kubernetes)
    SCENARIO             Scenario ID to run
    SUITE                Suite to run (smoke_suite, ci_suite, full_suite)
    DRY_RUN              Dry run mode (true, false)
    VERBOSE              Verbose mode (true, false)
    PROMETHEUS_URL       Prometheus URL for metrics collection
    HEALTH_CHECK_URL     Health check endpoint URL
    MAX_RECOVERY_TIME    Maximum recovery time in seconds (default: 300)

Available Suites:
    smoke_suite          Quick validation (2 scenarios)
    ci_suite             CI-safe scenarios (3 scenarios)
    full_suite           Complete test suite (6 scenarios)

Examples:
    # Run smoke suite against compose
    $0 --suite smoke_suite

    # Run specific scenario
    $0 --scenario kill-graphql-api

    # Run full suite against k8s
    $0 --target kubernetes --suite full_suite

    # Dry run to test configuration
    $0 --scenario kill-postgres --dry-run

    # Verbose output for debugging
    $0 --scenario network-latency-db --verbose

Exit Codes:
    0  Success - all scenarios passed
    1  General error
    2  Missing dependencies
    3  Invalid configuration
    4  Scenario execution failed
    5  Recovery timeout

Report Locations:
    JSON:  artifacts/chaos/reports/*.json
    HTML:  artifacts/chaos/reports/*.html

For more information, see: chaos/README.md
EOF
}

# Main function
main() {
    log_info "========================================="
    log_info "Resilience Lab Chaos Runner v2.0"
    log_info "========================================="
    log_info "Target: ${TARGET}"
    log_info "Dry Run: ${DRY_RUN}"
    log_info "Verbose: ${VERBOSE}"
    log_info ""

    # Set up cleanup trap
    setup_trap

    # Create required directories
    mkdir -p "$REPORTS_DIR" "$TEMP_DIR"

    # Validate environment
    log_info "Step 1/7: Checking dependencies..."
    check_dependencies || exit 2

    log_info "Step 2/7: Validating scenarios file..."
    validate_scenarios_file || exit 3

    log_info "Step 3/7: Checking for concurrent runs..."
    check_lock || exit 1

    log_info "Step 4/7: Validating target environment..."
    validate_target_environment || exit 1

    log_info "Step 5/7: Environment validation complete"
    log_info ""

    # Run scenario or suite
    local exit_code=0

    if [ -n "$SCENARIO" ]; then
        log_info "Step 6/7: Running single scenario: $SCENARIO"
        log_info ""

        local report
        if report=$(run_scenario "$SCENARIO"); then
            log_info ""
            log_info "Step 7/7: Generating HTML report..."
            generate_html_report "$report"

            # Check if scenario passed
            local status
            status=$(jq -r '.status' "$report")
            if [ "$status" != "pass" ]; then
                exit_code=4
            fi
        else
            exit_code=4
        fi
    else
        log_info "Step 6/7: Running test suite: $SUITE"
        log_info ""

        if run_suite "$SUITE"; then
            log_info ""
            log_info "Step 7/7: Generating HTML report..."

            # Find latest suite report
            local suite_report
            suite_report=$(ls -t "${REPORTS_DIR}/suite_${SUITE}"_*.json 2>/dev/null | head -1)

            if [ -n "$suite_report" ] && [ -f "$suite_report" ]; then
                generate_html_report "$suite_report"
            fi

            log_success "All scenarios passed!"
        else
            log_error "Some scenarios failed"

            # Still generate HTML report
            log_info "Step 7/7: Generating HTML report..."
            local suite_report
            suite_report=$(ls -t "${REPORTS_DIR}/suite_${SUITE}"_*.json 2>/dev/null | head -1)

            if [ -n "$suite_report" ] && [ -f "$suite_report" ]; then
                generate_html_report "$suite_report"
            fi

            exit_code=4
        fi
    fi

    log_info ""
    log_info "========================================="
    log_info "Chaos Runner Complete"
    log_info "========================================="
    log_info "Reports available in: $REPORTS_DIR"
    log_info ""

    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -s|--scenario)
            SCENARIO="$2"
            shift 2
            ;;
        -u|--suite)
            SUITE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main
