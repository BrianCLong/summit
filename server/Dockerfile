# =============================================================================
# Summit v4.0 - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Install pnpm (aligned with repo version)
RUN npm install -g pnpm@10.0.0

WORKDIR /app

# 1. Fetch dependencies (cached layer)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# 2. Copy source
COPY package.json .pnpmfile.cjs ./
COPY pnpm-workspace.yaml turbo.json ./
# Copy server package.json to ensure we can filter or install just what's needed
COPY server/package.json ./server/package.json
COPY . .

# 3. Install dependencies from virtual store (offline)
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.0.0

WORKDIR /app

# Copy everything from deps (which already has source and node_modules)
COPY --from=deps /app ./

# Build arguments
ARG VERSION=4.0.0
ARG BUILD_DATE
ARG GIT_SHA

# Set build-time environment variables
ENV VERSION=${VERSION}
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_SHA=${GIT_SHA}

# Build the application
RUN pnpm --filter intelgraph-server run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install runtime dependencies only
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype \
    tini \
    dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 summit && \
    adduser --system --uid 1001 --ingroup summit summit

WORKDIR /app

# Copy built application and deps
COPY --from=builder --chown=summit:summit /app/node_modules ./node_modules
COPY --from=builder --chown=summit:summit /app/server/dist ./server/dist
COPY --from=builder --chown=summit:summit /app/server/package.json ./server/
COPY --from=builder --chown=summit:summit /app/package.json ./

# Copy runtime assets if any
COPY --from=builder --chown=summit:summit /app/server/prisma ./server/prisma

# Build arguments for labels
ARG VERSION=4.0.0
ARG BUILD_DATE
ARG GIT_SHA

# OCI image labels
LABEL org.opencontainers.image.title="Summit Server" \
      org.opencontainers.image.description="Summit v4.0 - AI-Assisted Governance Platform" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.vendor="Summit" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.source="https://github.com/summit/server"

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose ports
EXPOSE 3000
EXPOSE 9090

# Switch to non-root user
USER summit

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server/dist/src/index.js"]
