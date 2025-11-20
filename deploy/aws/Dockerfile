# Multi-stage Dockerfile optimized for AWS Free Tier deployment
# Supports both ARM64 (t4g.small) and AMD64 architectures
# Production-hardened with minimal attack surface

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && ln -sf python3 /usr/bin/python

RUN npm install -g pnpm

COPY . /app

WORKDIR /app

RUN rm -rf /app/node_modules
RUN rm -rf /app/dist
RUN cd server && pnpm install
RUN cd server && pnpm add -D @types/node
RUN cd conductor-ui && pnpm install

# Build applications
RUN cd server && npm run build
RUN cd conductor-ui && npm run build

# Production stage
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S maestro && \
    adduser -S maestro -u 1001 -G maestro -h /app -s /bin/sh

# Install production dependencies and security tools
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC

WORKDIR /app

# Copy built applications from builder stage
COPY --from=builder --chown=maestro:maestro /app/server/dist ./server/
COPY --from=builder --chown=maestro:maestro /app/server/node_modules ./server/node_modules/
COPY --from=builder --chown=maestro:maestro /app/conductor-ui/build ./conductor-ui/

# Copy configuration files
COPY --chown=maestro:maestro server/package.json ./server/
COPY --chown=maestro:maestro deploy/aws/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp /app/data && \
    chown -R maestro:maestro /app

# Security: Remove package managers and build tools
RUN apk del --purge \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /root/.npm \
    && rm -rf /usr/share/man \
    && rm -rf /usr/share/doc

# Switch to non-root user
USER maestro

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    LOG_LEVEL=info \
    METRICS_ENABLED=true \
    SECURITY_HEADERS_ENABLED=true

# Labels for metadata
LABEL org.opencontainers.image.title="Maestro Conductor" \
      org.opencontainers.image.description="IntelGraph Maestro Conductor - AI-Augmented Intelligence Analysis Platform" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.source="https://github.com/brianclong/intelgraph" \
      org.opencontainers.image.documentation="https://github.com/brianclong/intelgraph/blob/main/README.md" \
      org.opencontainers.image.licenses="MIT"

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["./entrypoint.sh"]