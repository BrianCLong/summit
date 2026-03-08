#!/bin/bash

# Summit Golden Path Diagnostic Wrapper
# Purpose: Execute and verify the "Golden Path" (clean -> bootstrap -> up)

set -euo pipefail

CI_MODE=${1:-""}

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

log "🏔 Starting Summit Golden Path"

# Ensure .env exists
if [ ! -f .env ]; then
    log "📝 .env file missing. Copying from .env.example..."
    cp .env.example .env || error_exit "Failed to copy .env.example"
fi

# Step 1: Clean
log "🧹 Step 1/3: make clean..."
make clean || error_exit "make clean failed"

# Step 2: Bootstrap
log "📦 Step 2/3: make bootstrap..."
if make bootstrap; then
    log "✅ Bootstrap succeeded"
else
    log "❌ Bootstrap failed"
    exit 1
fi

# Step 3: Up
log "🚀 Step 3/3: make up..."
if [ "$CI_MODE" == "--ci" ]; then
    log "Verifying docker-compose config (CI mode)..."
    docker compose -f docker-compose.dev.yaml config > /dev/null || error_exit "docker-compose config validation failed"
    log "✅ Config valid. Skipping full bring-up in CI."
else
    if make up; then
        log "✅ Platform is up!"
    else
        log "❌ make up failed"
        log "DIAGNOSTICS:"
        if ! docker info >/dev/null 2>&1; then
            log "  - Docker daemon is not running."
        fi
        # Check for rate limit in stderr if possible, but make up already failed.
        # We can try to pull a small image to check rate limit explicitly
        if docker pull alpine:latest 2>&1 | grep -q "rate limit"; then
             log "  - Docker Hub rate limit detected."
        fi
        log "See docs/dev/golden-path-troubleshooting.md for more info."
        exit 1
    fi
fi

log "🎉 Golden Path Finished Successfully"
