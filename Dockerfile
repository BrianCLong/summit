# Multi-stage build for IntelGraph
# Production-hardened container configuration

# ==============================================================================
# Stage 1: Base dependencies
# ==============================================================================
FROM node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS base
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
FROM node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS build
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

# Create healthcheck script
RUN echo "const http = require('http'); \
const options = { host: 'localhost', port: 3000, path: '/healthz', timeout: 2000 }; \
const request = http.request(options, (res) => { \
  if (res.statusCode == 200) process.exit(0); \
  else process.exit(1); \
}); \
request.on('error', (err) => process.exit(1)); \
request.end();" > healthcheck.js

# ==============================================================================
# Stage 3: Production Runtime
# ==============================================================================
# Use Chainguard Node image (minimal, no shell, no apk)
FROM cgr.dev/chainguard/node@sha256:dc6e1253d18433294d67c76bc3eafa41177f3eed1272d0b89d2ca6154693aadc AS runtime

WORKDIR /app

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

# Copy healthcheck script
COPY --from=build --chown=node:node /app/healthcheck.js ./

# Security: Environment defaults for production
ENV NODE_ENV=production
ENV PORT=3000
ENV HEALTH_ENDPOINTS_ENABLED=true

# Expose application port
EXPOSE 3000

# Health check using node script (curl is not available)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "healthcheck.js"]

# Security: Run as non-root user (node user exists in Chainguard image)
USER node

# Entrypoint: Chainguard node image has node as entrypoint by default
# We can use CMD to specify the script
CMD ["server/dist/src/index.js"]
