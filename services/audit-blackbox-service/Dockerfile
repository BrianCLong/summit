# Audit Black Box Service Dockerfile
#
# Multi-stage build for secure, minimal production image.
# Includes security hardening and compliance features.

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# Build arguments
ARG NODE_VERSION=20
ARG BUILD_DATE
ARG VCS_REF

# Labels for compliance
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.title="Audit Black Box Service" \
      org.opencontainers.image.description="Immutable audit log service with cryptographic integrity" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.licenses="MIT"

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build application
RUN pnpm build

# Remove dev dependencies
RUN pnpm prune --prod

# ============================================================================
# Production Stage
# ============================================================================
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S audit && \
    adduser -u 1001 -S audit -G audit

# Security: Install only necessary packages
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=audit:audit /app/dist ./dist
COPY --from=builder --chown=audit:audit /app/node_modules ./node_modules
COPY --from=builder --chown=audit:audit /app/package.json ./

# Create directories for data
RUN mkdir -p /app/data /app/logs && \
    chown -R audit:audit /app

# Security: Set restrictive permissions
RUN chmod -R 750 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Switch to non-root user
USER audit

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# ============================================================================
# Development Stage (optional)
# ============================================================================
FROM node:20-alpine AS development

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

ENV NODE_ENV=development

CMD ["pnpm", "dev"]
