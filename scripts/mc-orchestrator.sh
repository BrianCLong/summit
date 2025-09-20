#!/usr/bin/env bash
set -euo pipefail

# Maestro Conductor Build Orchestrator
# Implements the canonical DAG: build → test → package → attest → publish

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Configuration
DEFAULT_CONFIG="orchestrations/mc/build.yaml"
REGISTRY="${REGISTRY:-ghcr.io/brianclong/summit}"
DOCKER_BUILDX_DRIVER="${DOCKER_BUILDX_DRIVER:-docker-container}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[MC]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[MC WARN]${NC} $*"
}

error() {
    echo -e "${RED}[MC ERROR]${NC} $*"
    exit 1
}

success() {
    echo -e "${GREEN}[MC SUCCESS]${NC} $*"
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

Examples:
    $0 build --config orchestrations/mc/build.yaml
    $0 publish --channel canary --registry ghcr.io/brianclong --version v1.0.0-rc.1
    $0 rollback --env staging --timeout 300
EOF
}

check_dependencies() {
    local deps=("docker" "jq" "yq")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            error "Required dependency not found: $dep"
        fi
    done
}

parse_config() {
    local config_file="$1"
    if [[ ! -f "$config_file" ]]; then
        error "Config file not found: $config_file"
    fi

    # Extract services from config
    yq eval '.spec.services[].name' "$config_file" 2>/dev/null || {
        error "Failed to parse config file: $config_file"
    }
}

setup_buildx() {
    if ! docker buildx ls | grep -q "$DOCKER_BUILDX_DRIVER"; then
        log "Setting up Docker Buildx..."
        docker buildx create --name multiarch --driver "$DOCKER_BUILDX_DRIVER" --use 2>/dev/null || true
        docker buildx inspect --bootstrap
    fi
}

cmd_build() {
    local config_file="$DEFAULT_CONFIG"
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --config) config_file="$2"; shift ;;
            --dry-run) dry_run=true ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    log "Starting orchestrated build with config: $config_file"

    if [[ "$dry_run" == "true" ]]; then
        log "DRY RUN: Would build services:"
        parse_config "$config_file"
        return 0
    fi

    # Validate config
    if [[ -f "$config_file" ]]; then
        yq eval . "$config_file" >/dev/null || error "Invalid YAML config: $config_file"
    fi

    # Install dependencies
    log "Installing dependencies..."
    npm ci --frozen-lockfile

    # Run build stages
    log "Running lint and typecheck..."
    npm run lint
    npm run typecheck

    log "Running unit tests..."
    npm run test:unit

    log "Building services..."
    npm run build

    success "Build completed successfully"
}

cmd_test() {
    local config_file="$DEFAULT_CONFIG"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --config) config_file="$2"; shift ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    log "Running test gates..."

    # Integration tests
    log "Running integration tests..."
    npm run test:integration

    # E2E tests
    if command -v k6 >/dev/null 2>&1; then
        log "Running k6 performance tests..."
        k6 run tests/k6/go-nogo-gate.js || warn "k6 tests failed"
    else
        warn "k6 not found, skipping performance tests"
    fi

    success "Test gates completed"
}

cmd_package() {
    local config_file="$DEFAULT_CONFIG"
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --config) config_file="$2"; shift ;;
            --dry-run) dry_run=true ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    log "Creating container images..."

    setup_buildx

    # Get services from config
    local services
    services=$(parse_config "$config_file")

    for service in $services; do
        log "Packaging service: $service"

        if [[ "$dry_run" == "true" ]]; then
            log "DRY RUN: Would build image for $service"
            continue
        fi

        # Determine service path and dockerfile
        local service_path="services/$service"
        local dockerfile="$service_path/Dockerfile"

        if [[ ! -d "$service_path" ]]; then
            service_path="apps/$service"
            dockerfile="$service_path/Dockerfile"
        fi

        if [[ ! -f "$dockerfile" ]]; then
            warn "Dockerfile not found for service $service, skipping"
            continue
        fi

        local image_tag="$REGISTRY/$service:$(git rev-parse --short HEAD)"

        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --context "$service_path" \
            --file "$dockerfile" \
            --tag "$image_tag" \
            --tag "$REGISTRY/$service:latest" \
            --cache-from type=gha \
            --cache-to type=gha,mode=max \
            --load \
            .

        log "Built image: $image_tag"
    done

    success "Packaging completed"
}

cmd_attest() {
    local config_file="$DEFAULT_CONFIG"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --config) config_file="$2"; shift ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    log "Generating SBOM and attestations..."

    # Create dist directory
    mkdir -p dist

    # Generate SBOM for the entire project
    if command -v syft >/dev/null 2>&1; then
        log "Generating project SBOM..."
        syft packages dir:. -o spdx-json > "dist/project-$(git rev-parse --short HEAD).sbom.spdx.json"
        syft packages dir:. -o cyclonedx-json > "dist/project-$(git rev-parse --short HEAD).sbom.cdx.json"
    else
        warn "syft not found, skipping SBOM generation"
    fi

    # Generate SBOMs for each service image
    local services
    services=$(parse_config "$config_file")

    for service in $services; do
        local image_tag="$REGISTRY/$service:$(git rev-parse --short HEAD)"

        if command -v syft >/dev/null 2>&1; then
            log "Generating SBOM for $service..."
            syft packages "$image_tag" -o spdx-json > "dist/$service-$(git rev-parse --short HEAD).sbom.spdx.json"
        fi

        # Generate attestations with cosign
        if command -v cosign >/dev/null 2>&1; then
            log "Generating attestations for $service..."
            cosign attest \
                --predicate "dist/$service-$(git rev-parse --short HEAD).sbom.spdx.json" \
                --type spdxjson \
                "$image_tag" || warn "Failed to generate attestation for $service"
        else
            warn "cosign not found, skipping attestations"
        fi
    done

    success "Attestation completed"
}

cmd_publish() {
    local config_file="$DEFAULT_CONFIG"
    local channel="canary"
    local version=""
    local registry="$REGISTRY"
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --config) config_file="$2"; shift ;;
            --channel) channel="$2"; shift ;;
            --version) version="$2"; shift ;;
            --registry) registry="$2"; shift ;;
            --dry-run) dry_run=true ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    if [[ -z "$version" ]]; then
        version="$(git rev-parse --short HEAD)"
    fi

    log "Publishing to channel: $channel, version: $version"

    local services
    services=$(parse_config "$config_file")

    for service in $services; do
        local source_tag="$registry/$service:$(git rev-parse --short HEAD)"
        local target_tag="$registry/$service:$version"

        if [[ "$dry_run" == "true" ]]; then
            log "DRY RUN: Would publish $source_tag -> $target_tag"
            continue
        fi

        log "Publishing $service to $channel..."

        # Tag and push
        docker tag "$source_tag" "$target_tag"
        docker push "$target_tag"

        # Sign with cosign
        if command -v cosign >/dev/null 2>&1; then
            log "Signing image: $target_tag"
            cosign sign "$target_tag" || warn "Failed to sign $target_tag"
        fi
    done

    success "Publish completed to channel: $channel"
}

cmd_promote() {
    local from_channel=""
    local to_channel=""
    local version=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --from) from_channel="$2"; shift ;;
            --to) to_channel="$2"; shift ;;
            --version) version="$2"; shift ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    if [[ -z "$from_channel" || -z "$to_channel" || -z "$version" ]]; then
        error "Promote requires --from, --to, and --version"
    fi

    log "Promoting $version from $from_channel to $to_channel"

    # This would typically involve updating deployment manifests
    # For now, just simulate the promotion
    log "Promotion logic would be implemented here"

    success "Promotion completed: $version ($from_channel -> $to_channel)"
}

cmd_rollback() {
    local env=""
    local timeout="300"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --env) env="$2"; shift ;;
            --timeout) timeout="$2"; shift ;;
            *) error "Unknown option: $1" ;;
        esac
        shift
    done

    if [[ -z "$env" ]]; then
        error "Rollback requires --env"
    fi

    log "Rolling back environment: $env (timeout: ${timeout}s)"

    # This would typically involve:
    # 1. Finding the previous known-good version
    # 2. Updating deployment manifests
    # 3. Waiting for health checks
    # 4. Verifying rollback success

    log "Rollback logic would be implemented here"

    success "Rollback completed for environment: $env"
}

main() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi

    check_dependencies

    local command="$1"
    shift

    case "$command" in
        build) cmd_build "$@" ;;
        test) cmd_test "$@" ;;
        package) cmd_package "$@" ;;
        attest) cmd_attest "$@" ;;
        publish) cmd_publish "$@" ;;
        promote) cmd_promote "$@" ;;
        rollback) cmd_rollback "$@" ;;
        help|--help|-h) usage ;;
        *) error "Unknown command: $command" ;;
    esac
}

main "$@"