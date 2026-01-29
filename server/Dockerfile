# =============================================================================
# Summit v4.0 - Monorepo Server Dockerfile
# =============================================================================
# Multi-stage build for optimized production image, built from ROOT context.
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

# Copy workspace definition files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests (to allow install without full source)
# We copy the entire directory structures for simplicity in this hardening sprint,
# but ideally we'd use 'pnpm fetch' or just copy package.jsons.
COPY server/package.json ./server/
COPY packages/ ./packages/
COPY libs/ ./libs/
COPY services/ ./services/
COPY client/package.json ./client/
# Copy schemas if they contain package.json or are referenced
COPY schemas/ ./schemas/

# Install dependencies (frozen lockfile might fail if we miss some package.jsons, 
# so we use --no-frozen-lockfile for resilience in this sprint)
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
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/libs ./libs
COPY --from=deps /app/services ./services

# Copy source code for server and dependencies
COPY server/ ./server/
COPY schemas/ ./schemas/
COPY packages/ ./packages/
COPY libs/ ./libs/

# Build arguments
ARG VERSION=4.0.0
ARG BUILD_DATE
ARG GIT_SHA

# Set build-time environment variables
ENV VERSION=${VERSION}
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_SHA=${GIT_SHA}

# Build the application
WORKDIR /app/server
RUN pnpm build

# Prune dev dependencies (optional, can be tricky in monorepo)
# RUN pnpm prune --prod

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

WORKDIR /app/server

# Copy built application and necessary workspace files
COPY --from=builder --chown=summit:summit /app/server/dist ./dist
COPY --from=builder --chown=summit:summit /app/server/package.json ./
# We need node_modules at root for workspace dependencies to resolve
COPY --from=builder --chown=summit:summit /app/node_modules /app/node_modules
# We might need linked packages if they are symlinked
COPY --from=builder --chown=summit:summit /app/packages /app/packages
COPY --from=builder --chown=summit:summit /app/libs /app/libs

# Copy runtime assets if any
# COPY --from=builder --chown=summit:summit /app/server/prisma ./prisma

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