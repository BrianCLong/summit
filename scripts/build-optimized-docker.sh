#!/bin/bash
# ============================================================================
# Optimized Docker Build Script for Summit/IntelGraph
# ============================================================================
# Features:
# - BuildKit caching with registry cache
# - Multi-platform builds
# - Parallel builds for multiple services
# - Size optimization reporting
# - SBOM generation
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }
bold() { echo -e "${BOLD}$1${NC}"; }

# Configuration
REGISTRY="${REGISTRY:-ghcr.io/brianclong}"
IMAGE_NAME="${IMAGE_NAME:-summit}"
VERSION="${VERSION:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
CACHE_REPO="${CACHE_REPO:-${REGISTRY}/${IMAGE_NAME}:cache}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.optimized}"

# Build options
PUSH="${PUSH:-false}"
BUILD_ARGS="${BUILD_ARGS:-}"
NO_CACHE="${NO_CACHE:-false}"
PROVENANCE="${PROVENANCE:-true}"
SBOM="${SBOM:-true}"

show_help() {
    cat << EOF
🐳 Optimized Docker Build Script

Usage: $0 [OPTIONS]

Options:
    --image <name>          Image name (default: summit)
    --version <tag>         Image version tag (default: latest)
    --registry <url>        Container registry (default: ghcr.io/brianclong)
    --dockerfile <path>     Dockerfile path (default: Dockerfile.optimized)
    --platforms <list>      Build platforms (default: linux/amd64,linux/arm64)
    --push                  Push to registry after build
    --no-cache              Disable cache (clean build)
    --cache-repo <url>      Cache repository (default: <registry>/<image>:cache)
    --build-arg <arg>       Add build argument (can be used multiple times)
    --no-provenance         Disable provenance attestation
    --no-sbom               Disable SBOM generation
    --help                  Show this help message

Environment Variables:
    API_BASE_URL            API base URL for build
    GRAPHQL_SCHEMA_URL      GraphQL schema URL for build
    TURBO_TOKEN             Turbo cache token
    TURBO_TEAM              Turbo team name

Examples:
    # Basic build
    $0 --version v1.2.3

    # Build and push to registry
    $0 --version v1.2.3 --push

    # Build for specific platform only
    $0 --version v1.2.3 --platforms linux/amd64

    # Clean build without cache
    $0 --version v1.2.3 --no-cache

    # Build with custom build args
    $0 --version v1.2.3 --build-arg API_BASE_URL=https://api.prod.example.com
EOF
}

# Check dependencies
check_deps() {
    local missing_deps=()

    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi

    if ! docker buildx version &> /dev/null; then
        error "Docker Buildx is required but not available"
        error "Install with: docker buildx install"
        exit 1
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
}

# Setup buildx builder
setup_builder() {
    local builder_name="summit-builder"

    if ! docker buildx inspect "$builder_name" &> /dev/null; then
        info "Creating buildx builder: $builder_name"
        docker buildx create \
            --name "$builder_name" \
            --driver docker-container \
            --bootstrap \
            --use
    else
        info "Using existing buildx builder: $builder_name"
        docker buildx use "$builder_name"
    fi

    docker buildx inspect --bootstrap
}

# Build image with optimizations
build_image() {
    local full_image="${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    local latest_image="${REGISTRY}/${IMAGE_NAME}:latest"

    bold "🏗️  Building Docker image: $full_image"

    # Prepare build arguments
    local build_args_array=()

    # Add environment-specific build args
    if [ -n "${API_BASE_URL:-}" ]; then
        build_args_array+=("--build-arg" "API_BASE_URL=${API_BASE_URL}")
    fi

    if [ -n "${GRAPHQL_SCHEMA_URL:-}" ]; then
        build_args_array+=("--build-arg" "GRAPHQL_SCHEMA_URL=${GRAPHQL_SCHEMA_URL}")
    fi

    if [ -n "${TURBO_TOKEN:-}" ]; then
        build_args_array+=("--build-arg" "TURBO_TOKEN=${TURBO_TOKEN}")
    fi

    if [ -n "${TURBO_TEAM:-}" ]; then
        build_args_array+=("--build-arg" "TURBO_TEAM=${TURBO_TEAM}")
    fi

    # Add custom build args
    if [ -n "$BUILD_ARGS" ]; then
        for arg in $BUILD_ARGS; do
            build_args_array+=("--build-arg" "$arg")
        done
    fi

    # Prepare cache arguments
    local cache_args=()
    if [ "$NO_CACHE" != "true" ]; then
        cache_args+=(
            "--cache-from" "type=registry,ref=${CACHE_REPO}"
            "--cache-to" "type=registry,ref=${CACHE_REPO},mode=max"
        )
    fi

    # Prepare output arguments
    local output_args=()
    if [ "$PUSH" == "true" ]; then
        output_args+=("--push")
    else
        output_args+=("--load")
    fi

    # Prepare attestation arguments
    local attestation_args=()
    if [ "$PROVENANCE" == "true" ]; then
        attestation_args+=("--provenance=true")
    fi

    if [ "$SBOM" == "true" ]; then
        attestation_args+=("--sbom=true")
    fi

    # Build command
    info "Build configuration:"
    info "  Image: $full_image"
    info "  Platforms: $PLATFORMS"
    info "  Dockerfile: $DOCKERFILE"
    info "  Cache: ${NO_CACHE:-enabled}"
    info "  Push: $PUSH"
    info "  Provenance: $PROVENANCE"
    info "  SBOM: $SBOM"

    # Execute build
    local build_start=$(date +%s)

    docker buildx build \
        --file "$DOCKERFILE" \
        --platform "$PLATFORMS" \
        --tag "$full_image" \
        --tag "$latest_image" \
        "${build_args_array[@]}" \
        "${cache_args[@]}" \
        "${output_args[@]}" \
        "${attestation_args[@]}" \
        --progress=plain \
        "$PROJECT_ROOT"

    local build_end=$(date +%s)
    local build_duration=$((build_end - build_start))

    log "✅ Build completed in ${build_duration}s"

    # Show image size if not pushing (local build)
    if [ "$PUSH" != "true" ] && [ "$PLATFORMS" == "linux/amd64" ]; then
        info "Image size:"
        docker images "$full_image" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    fi
}

# Analyze image
analyze_image() {
    local full_image="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

    if [ "$PUSH" != "true" ] && [ "$PLATFORMS" == "linux/amd64" ]; then
        bold "🔍 Analyzing image: $full_image"

        # Image layers
        info "Image history:"
        docker history "$full_image" --no-trunc --format "table {{.CreatedBy}}\t{{.Size}}" | head -20

        # Security scan (if dive is available)
        if command -v dive &> /dev/null; then
            info "Running dive analysis..."
            CI=true dive "$full_image" --ci
        else
            warn "Install 'dive' for detailed image analysis: https://github.com/wagoodman/dive"
        fi
    fi
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --dockerfile)
                DOCKERFILE="$2"
                shift 2
                ;;
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            --push)
                PUSH="true"
                shift
                ;;
            --no-cache)
                NO_CACHE="true"
                shift
                ;;
            --cache-repo)
                CACHE_REPO="$2"
                shift 2
                ;;
            --build-arg)
                BUILD_ARGS="$BUILD_ARGS $2"
                shift 2
                ;;
            --no-provenance)
                PROVENANCE="false"
                shift
                ;;
            --no-sbom)
                SBOM="false"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main
main() {
    parse_args "$@"

    bold "🚀 Summit Docker Build Optimization Script"

    check_deps
    setup_builder
    build_image
    analyze_image

    log "✨ Docker build completed successfully!"
}

main "$@"
