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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml intelgraph-feature-flags-4.2.3.tgz intelgraph-telemetry-config-4.2.3.tgz ./

# Install all dependencies (including dev for build)
RUN pnpm install --no-frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Build arguments
ARG VERSION=4.0.0
ARG BUILD_DATE
ARG GIT_SHA

# Set build-time environment variables
ENV VERSION=${VERSION}
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_SHA=${GIT_SHA}

# Build the application
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

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

# Copy built application
COPY --from=builder --chown=summit:summit /app/dist ./dist
COPY --from=builder --chown=summit:summit /app/node_modules ./node_modules
COPY --from=builder --chown=summit:summit /app/package.json ./

# Copy runtime assets if any
COPY --from=builder --chown=summit:summit /app/prisma ./prisma

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
CMD ["node", "dist/index.js"]
