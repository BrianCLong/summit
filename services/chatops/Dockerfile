# ============================================================================
# ChatOps Service Dockerfile
# Multi-stage build for production-ready container
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# ---------------------------------------------------------------------------
# Stage 3: Production
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Security hardening
RUN apk add --no-cache dumb-init \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 chatops

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy built application
COPY --from=builder --chown=chatops:nodejs /app/dist ./dist
COPY --from=builder --chown=chatops:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=chatops:nodejs /app/package.json ./package.json

# Copy OPA policies
COPY --from=builder --chown=chatops:nodejs /app/src/policies ./policies

# Create necessary directories
RUN mkdir -p /app/.cache && chown chatops:nodejs /app/.cache

# Switch to non-root user
USER chatops

# Expose ports
EXPOSE 8080 9090 9464

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]

# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------
LABEL org.opencontainers.image.title="Summit ChatOps Service" \
      org.opencontainers.image.description="Frontier ChatOps service for Summit intelligence platform" \
      org.opencontainers.image.vendor="Summit" \
      org.opencontainers.image.source="https://github.com/BrianCLong/summit" \
      org.opencontainers.image.licenses="MIT"
