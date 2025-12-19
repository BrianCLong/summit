# P23: Docker Bake configuration for parallel multi-platform builds
# Usage: docker buildx bake -f docker-bake.hcl

variable "REGISTRY" {
  default = "ghcr.io/brianclong/summit"
}

variable "VERSION" {
  default = "latest"
}

variable "GIT_SHA" {
  default = ""
}

variable "BUILD_DATE" {
  default = ""
}

# Groups for building multiple images at once
group "default" {
  targets = ["api", "web", "gateway", "copilot"]
}

group "all" {
  targets = ["api", "web", "gateway", "copilot", "analytics", "workers"]
}

group "core" {
  targets = ["api", "web", "gateway"]
}

# Common settings inherited by all targets
target "_common" {
  dockerfile = "infra/docker/Dockerfile.optimized"
  platforms  = ["linux/amd64", "linux/arm64"]
  labels = {
    "org.opencontainers.image.source"   = "https://github.com/BrianCLong/summit"
    "org.opencontainers.image.revision" = "${GIT_SHA}"
    "org.opencontainers.image.created"  = "${BUILD_DATE}"
  }
  cache-from = ["type=gha"]
  cache-to   = ["type=gha,mode=max"]
}

# API Server
target "api" {
  inherits = ["_common"]
  context  = "."
  target   = "production"
  args = {
    SERVICE = "api"
  }
  tags = [
    "${REGISTRY}/api:${VERSION}",
    "${REGISTRY}/api:${GIT_SHA}",
    "${REGISTRY}/api:latest"
  ]
}

# Web Frontend
target "web" {
  inherits   = ["_common"]
  context    = "."
  dockerfile = "client/Dockerfile"
  tags = [
    "${REGISTRY}/web:${VERSION}",
    "${REGISTRY}/web:${GIT_SHA}",
    "${REGISTRY}/web:latest"
  ]
}

# API Gateway
target "gateway" {
  inherits = ["_common"]
  context  = "."
  target   = "production"
  args = {
    SERVICE = "gateway"
  }
  tags = [
    "${REGISTRY}/gateway:${VERSION}",
    "${REGISTRY}/gateway:${GIT_SHA}",
    "${REGISTRY}/gateway:latest"
  ]
}

# Copilot AI Service
target "copilot" {
  inherits = ["_common"]
  context  = "."
  target   = "production"
  args = {
    SERVICE = "copilot"
  }
  tags = [
    "${REGISTRY}/copilot:${VERSION}",
    "${REGISTRY}/copilot:${GIT_SHA}",
    "${REGISTRY}/copilot:latest"
  ]
}

# Analytics Engine
target "analytics" {
  inherits = ["_common"]
  context  = "."
  target   = "production"
  args = {
    SERVICE = "analytics"
  }
  tags = [
    "${REGISTRY}/analytics:${VERSION}",
    "${REGISTRY}/analytics:${GIT_SHA}",
    "${REGISTRY}/analytics:latest"
  ]
}

# Background Workers
target "workers" {
  inherits = ["_common"]
  context  = "."
  target   = "production"
  args = {
    SERVICE = "workers"
  }
  tags = [
    "${REGISTRY}/workers:${VERSION}",
    "${REGISTRY}/workers:${GIT_SHA}",
    "${REGISTRY}/workers:latest"
  ]
}

# Development target (not multi-platform)
target "dev" {
  inherits  = ["_common"]
  context   = "."
  target    = "development"
  platforms = ["linux/amd64"]
  tags      = ["${REGISTRY}/dev:local"]
  cache-to  = []
}
