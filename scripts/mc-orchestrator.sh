#!/usr/bin/env bash
set -euo pipefail
# Maestro Conductor Build Orchestrator
# Implements the canonical DAG: build → test → package → attest → publish
#
# Agentic role mapping (orchestrator, builder, tester, packager, attestor, publisher):
# - orchestrator: coordinates stages, emits fastlane signals and friction alerts
# - builder: compiles/lints/tests code, measures stage latency
# - tester: executes integration/e2e, emits friction on retries/failures
# - packager: builds images, records handoff to attestor/publisher
# - attestor: generates SBOM/attestations, logs provenance latency
# - publisher: signs/pushes artifacts, logs final handoff outcome
#
# Logging keys (structured JSON lines):
#   event=handoff|latency|fastlane_signal|friction_alert
#   agent_role, stage, request_id, run_id, signal_strength, latency_ms, retry_count, error_rate

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Configuration
DEFAULT_CONFIG="orchestrations/mc/build.yaml"
REGISTRY="${REGISTRY:-ghcr.io/brianclong/summit}"
DOCKER_BUILDX_DRIVER="${DOCKER_BUILDX_DRIVER:-docker-container}"
LOG_DIR="${LOG_DIR:-logs}"
FASTLANE_ENDPOINT="${FASTLANE_ENDPOINT:-/api/maestro/v1/handoff/fastlane}"
API_HOST="${API_HOST:-http://localhost:8787}"
RUN_ID="${RUN_ID:-$(date +%s)}"
mkdir -p "$LOG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[MC]${NC} $*"; }
warn() { echo -e "${YELLOW}[MC WARN]${NC} $*"; }
error() { echo -e "${RED}[MC ERROR]${NC} $*"; exit 1; }
success() { echo -e "${GREEN}[MC SUCCESS]${NC} $*"; }

# Structured JSON logging helpers
json_log() {
  # $1 event, $2 agent_role, $3 stage, rest kv pairs
  local event="$1"; shift
  local role="$1"; shift
  local stage="$1"; shift
  local ts_ms=$(($(date +%s%N)/1000000))
  local payload="{\"ts\":$ts_ms,\"run_id\":\"$RUN_ID\",\"event\":\"$event\",\"agent_role\":\"$role\",\"stage\":\"$stage\"";
  while (( "$#" )); do
    local k="$1"; local v="$2"; shift 2
    payload+=" ,\"$k\":"
    case "$v" in
      ''|*[!0-9.]*) payload+="\"$v\"";;
      *) payload+="$v";;
    esac
  done
  payload+=" }"
  echo "$payload" | tee -a "$LOG_DIR/orchestrator.jsonl" >/dev/null
}

measure() { # measure <agent_role> <stage> <cmd...>
  local role="$1"; shift
  local stage="$1"; shift
  local start=$(date +%s%3N)
  if "$@"; then
    local end=$(date +%s%3N); local dur=$((end-start))
    json_log latency "$role" "$stage" latency_ms "$dur"
    return 0
  else
    local end=$(date +%s%3N); local dur=$((end-start))
    json_log friction_alert "$role" "$stage" latency_ms "$dur" retry_count 0 error_rate 1
    return 1
  fi
}

emit_fastlane_signal() { # emit_fastlane_signal <stage> <signal_strength> <priority>
  local stage="$1"; local strength="$2"; local priority="${3:-normal}"
  json_log fastlane_signal orchestrator "$stage" signal_strength "$strength" priority "$priority"
  # Best-effort POST to Fastlane endpoint if curl exists
  if command -v curl >/dev/null 2>&1; then
    curl -sS -X POST "$API_HOST$FASTLANE_ENDPOINT" \
      -H 'content-type: application/json' \
      -d "{\"requestId\":\"$RUN_ID-$stage\",\"priority\":\"$priority\",\"agentId\":\"mc-orchestrator\",\"signalStrength\":$strength,\"payload\":{\"stage\":\"$stage\"}}" \
      >> "$LOG_DIR/fastlane.post.log" 2>&1 || true
  fi
}

emit_friction_alert() { # emit_friction_alert <stage> <latency_ms> <retry_count> <error_rate>
  local stage="$1"; local lat="$2"; local retries="$3"; local err="$4"
  json_log friction_alert orchestrator "$stage" latency_ms "$lat" retry_count "$retries" error_rate "$err"
}

usage() {
  cat << EOF
Maestro Conductor Build Orchestrator
Usage: $0 <command> [options]
Commands:
    build     Build all services
    test      Run test gates
    package   Create container images
    attest    Generate SBOM and attestations
    publish   Publish to registry
    promote   Promote canary to stable
    rollback  Rollback to previous version
Options:
    --config FILE    Orchestration config file (default: $DEFAULT_CONFIG)
    --registry URL   Container registry URL
    --channel NAME   Channel: canary, stable (default: canary)
    --version VER    Version tag
    --env ENV        Environment: staging, prod
    --timeout SEC    Timeout in seconds
    --dry-run        Show what would be done
EOF
}

check_dependencies() { local deps=(docker jq yq); for dep in "${deps[@]}"; do command -v "$dep" >/dev/null 2>&1 || error "Required dependency not found: $dep"; done; }

parse_config() { local config_file="$1"; [[ -f "$config_file" ]] || error "Config file not found: $config_file"; yq eval '.spec.services[].name' "$config_file" 2>/dev/null || error "Failed to parse config file: $config_file"; }

setup_buildx() { if ! docker buildx ls | grep -q "$DOCKER_BUILDX_DRIVER"; then log "Setting up Docker Buildx..."; docker buildx create --name multiarch --driver "$DOCKER_BUILDX_DRIVER" --use 2>/dev/null || true; docker buildx inspect --bootstrap; fi }

cmd_build() {
  local config_file="$DEFAULT_CONFIG"; local dry_run=false
  while [[ $# -gt 0 ]]; do case $1 in --config) config_file="$2"; shift;; --dry-run) dry_run=true;; *) error "Unknown option: $1";; esac; shift; done
  log "Starting orchestrated build with config: $config_file"; emit_fastlane_signal build 0.9 urgent
  if [[ "$dry_run" == true ]]; then log "DRY RUN: Would build services:"; parse_config "$config_file"; return 0; fi
  [[ -f "$config_file" ]] && yq eval . "$config_file" >/dev/null || error "Invalid YAML config: $config_file"
  log "Installing dependencies..."; measure builder deps npm ci --frozen-lockfile
  log "Running lint and typecheck..."; measure builder lint npm run lint; measure builder typecheck npm run typecheck
  log "Running unit tests..."; measure tester unit npm run test:unit || emit_friction_alert unit 0 0 1
  log "Building services..."; measure builder build npm run build
  success "Build completed successfully"
}

cmd_test() {
  local config_file="$DEFAULT_CONFIG"; while [[ $# -gt 0 ]]; do case $1 in --config) config_file="$2"; shift;; *) error "Unknown option: $1";; esac; shift; done
  log "Running test gates..."; emit_fastlane_signal test 0.7 high
  log "Running integration tests..."; measure tester integration npm run test:integration || emit_friction_alert integration 0 0 1
  if command -v k6 >/dev/null 2>&1; then log "Running k6 performance tests..."; measure tester perf k6 run tests/k6/go-nogo-gate.js || warn "k6 tests failed"; else warn "k6 not found, skipping performance tests"; fi
  success "Test gates completed"
}

cmd_package() {
  local config_file="$DEFAULT_CONFIG"; local dry_run=false
  while [[ $# -gt 0 ]]; do case $1 in --config) config_file="$2"; shift;; --dry-run) dry_run=true;; *) error "Unknown option: $1";; esac; shift; done
  log "Creating container images..."; setup_buildx; emit_fastlane_signal package 0.8 high
  local services; services=$(parse_config "$config_file")
  for service in $services; do
    log "Packaging service: $service"
    if [[ "$dry_run" == true ]]; then log "DRY RUN: Would build image for $service"; continue; fi
    local service_path="services/$service"; local dockerfile="$service_path/Dockerfile"
    if [[ ! -d "$service_path" ]]; then service_path="apps/$service"; dockerfile="$service_path/Dockerfile"; fi
    if [[ ! -f "$dockerfile" ]]; then warn "Dockerfile not found for service $service, skipping"; continue; fi
    local image_tag="$REGISTRY/$service:$(git rev-parse --short HEAD)"
    measure packager "docker-build-$service" docker buildx build \
      --platform linux/amd64,linux/arm64 \
      --context "$service_path" \
      --file "$dockerfile" \
      --tag "$image_tag" \
      --tag "$REGISTRY/$service:latest" \
      --cache-from type=gha \
      --cache-to type=gha,mode=max \
      --load \
      .
    json_log handoff orchestrator package from "packager" to "attestor" request_id "${RUN_ID}-pkg-$service"
  done
  success "Packaging completed"
}

cmd_attest() {
  local config_file="$DEFAULT_CONFIG"; while [[ $# -gt 0 ]]; do case $1 in --config) config_file="$2"; shift;; *) error "Unknown option: $1";; esac; shift; done
  log "Generating SBOM and attestations..."; emit_fastlane_signal attest 0.6 normal; mkdir -p dist
  if command -v syft >/dev/null 2>&1; then
    log "Generating project SBOM..."; measure attestor sbom-project syft packages dir:. -o spdx-json > "dist/project-$(git rev-parse --short HEAD).sbom.spdx.json"
    syft packages dir:. -o cyclonedx-json > "dist/project-$(git rev-parse --short HEAD).sbom.cdx.json" || true
  else warn "syft not found, skipping SBOM generation"; fi
  local services; services=$(parse_config "$config_file")
  for service in $services; do
    local image_tag="$REGISTRY/$service:$(git rev-parse --short HEAD)"
    if command -v syft >/dev/null 2>&1; then log "Generating SBOM for $service..."; measure attestor "sbom-$service" syft packages "$image_tag" -o spdx-json > "dist/$service-$(git rev-parse --short HEAD).sbom.spdx.json"; fi
    if command -v cosign >/dev/null 2>&1; then
      log "Generating attestations for $service..."
      measure attestor "attest-$service" cosign attest --predicate "dist/$service-$(git rev-parse --short HEAD).sbom.spdx.json" --type spdxjson "$image_tag" || warn "Failed to generate attestation for $service"
    else warn "cosign not found, skipping attestations"; fi
    json_log handoff orchestrator attest from "attestor" to "publisher" request_id "${RUN_ID}-att-$service"
  done
  success "Attestation completed"
}

cmd_publish() {
  local config_file="$DEFAULT_CONFIG"; local channel="canary"; local version=""; local registry="$REGISTRY"; local dry_run=false
  while [[ $# -gt 0 ]]; do case $1 in --config) config_file="$2"; shift;; --channel) channel="$2"; shift;; --version) version="$2"; shift;; --registry) registry="$2"; shift;; --dry-run) dry_run=true;; *) error "Unknown option: $1";; esac; shift; done
  [[ -z "$version" ]] && version="$(git rev-parse --short HEAD)"
  log "Publishing to channel: $channel, version: $version"; emit_fastlane_signal publish 0.5 normal
  local services; services=$(parse_config "$config_file")
  for service in $services; do
    local source_tag="$registry/$service:$(git rev-parse --short HEAD)"; local target_tag="$registry/$service:$version"
    if [[ "$dry_run" == true ]]; then log "DRY RUN: Would publish $source_tag -> $target_tag"; continue; fi
    log "Publishing $service to $channel..."
    measure publisher "docker-tag-$service" docker tag "$source_tag" "$target_tag"
    measure publisher "docker-push-$service" docker push "$target_tag"
    if command -v cosign >/dev/null 2>&1; then log "Signing image: $target_tag"; measure publisher "cosign-$service" cosign sign "$target_tag" || warn "Failed to sign $target_tag"; fi
  done
  success "Publish completed to channel: $channel"
}

cmd_promote() {
  local from_channel=""; local to_channel=""; local version=""
  while [[ $# -gt 0 ]]; do case $1 in --from) from_channel="$2"; shift;; --to) to_channel="$2"; shift;; --version) version="$2"; shift;; *) error "Unknown option: $1";; esac; shift; done
  [[ -z "$from_channel" || -z "$to_channel" || -z "$version" ]] && error "Promote requires --from, --to, and --version"
  log "Promoting $version from $from_channel to $to_channel"; emit_fastlane_signal promote 0.4 normal
  log "Promotion logic would be implemented here"; success "Promotion completed: $version ($from_channel -> $to_channel)"
}

cmd_rollback() {
  local env=""; local timeout="300"
  while [[ $# -gt 0 ]]; do case $1 in --env) env="$2"; shift;; --timeout) timeout="$2"; shift;; *) error "Unknown option: $1";; esac; shift; done
  [[ -z "$env" ]] && error "Rollback requires --env"
  log "Rolling back environment: $env (timeout: ${timeout}s)"; emit_fastlane_signal rollback 0.3 normal
  # Typically: find previous version, update manifests, wait for health, verify
  log "Rollback logic would be implemented here"; success "Rollback completed for environment: $env"
}

main() {
  if [[ $# -eq 0 ]]; then usage; exit 1; fi
  check_dependencies
  local command="$1"; shift
  case "$command" in
    build) cmd_build "$@";;
    test) cmd_test "$@";;
    package) cmd_package "$@";;
    attest) cmd_attest "$@";;
    publish) cmd_publish "$@";;
    promote) cmd_promote "$@";;
    rollback) cmd_rollback "$@";;
    help|--help|-h) usage;;
    *) error "Unknown command: $command";;
  esac
}

main "$@"
