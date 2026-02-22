# Multi-stage build for IntelGraph
# Production-hardened container configuration

# ==============================================================================
# Stage 1: Base dependencies
# ==============================================================================
FROM node:22-alpine AS base
WORKDIR /app

# Security: Add labels for image metadata
LABEL org.opencontainers.image.title="IntelGraph Platform"
LABEL org.opencontainers.image.description="Intelligence analysis platform with AI-augmented graph analytics"
LABEL org.opencontainers.image.vendor="Summit"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"

# Use pnpm for package management (version must match package.json packageManager field)
RUN npm install -g pnpm@10.0.0
COPY package.json pnpm-lock.yaml turbo.json .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ==============================================================================
# Stage 2: Build
# ==============================================================================
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.0.0

# Copy all source files first, then install dependencies
# This ensures all workspace package.json files are present for proper dependency resolution
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build arguments for compile-time configuration
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
ARG GRAPHQL_SCHEMA_URL
ENV GRAPHQL_SCHEMA_URL=$GRAPHQL_SCHEMA_URL
ARG BUILD_VERSION=unknown
ARG BUILD_COMMIT=unknown

# Inject build metadata
ENV APP_VERSION=$BUILD_VERSION
ENV GIT_COMMIT=$BUILD_COMMIT

RUN pnpm run build

# ==============================================================================
# Stage 3: Production Runtime
# ==============================================================================
FROM node:22-alpine AS runtime

# Security: Install only runtime dependencies
# - dumb-init: Proper PID 1 signal handling
# - curl: For healthcheck
# - ca-certificates: For HTTPS connections
RUN apk add --no-cache dumb-init curl ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Security: Create dedicated app user (already exists as node:1000, but explicit)
# The node user already exists in node:alpine with UID 1000

# Copy production node_modules
COPY --from=base --chown=node:node /app/node_modules ./node_modules

# Copy built server
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/package.json ./server/

# Copy built packages (workspace dependencies)
COPY --from=build --chown=node:node /app/packages ./packages

# Copy root config files
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/turbo.json ./
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./

# Security: Environment defaults for production
ENV NODE_ENV=production
ENV PORT=3000
ENV HEALTH_ENDPOINTS_ENABLED=true

# Expose application port
EXPOSE 3000

# Health check for container orchestration (K8s liveness/readiness)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Security: Run as non-root user
USER node

# Use dumb-init for proper signal handling (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/src/index.js"]
