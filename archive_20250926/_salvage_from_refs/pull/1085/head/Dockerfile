# Multi-stage build for Maestro Orchestration System
ARG NODE_VERSION=18.19.0
ARG BUILD_VERSION=unknown
ARG BUILD_DATE=unknown  
ARG VCS_REF=unknown

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# Build the application
RUN npm run build --workspace=server

# Remove dev dependencies
RUN npm ci --production=true && npm cache clean --force

# Production stage
FROM node:${NODE_VERSION}-alpine AS production

# Create non-root user
RUN addgroup -g 10001 -S maestro && adduser -u 10001 -S maestro -G maestro

# Install security updates and dumb-init
RUN apk add --no-cache dumb-init ca-certificates && \
    apk upgrade --no-cache

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json

# Copy configuration files
RUN mkdir -p /app/config /app/cache /app/logs
COPY --chown=maestro:maestro server/config ./config

# Set ownership and permissions
RUN chown -R maestro:maestro /app && \
    chmod -R 755 /app && \
    chmod -R 750 /app/config && \
    chmod -R 755 /app/cache && \
    chmod -R 755 /app/logs

# Security: remove package managers and shells
RUN rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/bin/npm && \
    rm -rf /usr/local/bin/npx

# Add health check script
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1' > /usr/local/bin/healthcheck && \
    chmod +x /usr/local/bin/healthcheck

# Metadata labels
LABEL org.opencontainers.image.title="Maestro Orchestration System" \
      org.opencontainers.image.description="Production-grade AI orchestration and routing system" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="IntelGraph AI" \
      org.opencontainers.image.source="https://github.com/BrianCLong/intelgraph" \
      org.opencontainers.image.licenses="Proprietary"

# Switch to non-root user
USER maestro:maestro

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    LOG_LEVEL=info \
    NODE_OPTIONS="--max-old-space-size=2048" \
    UV_THREADPOOL_SIZE=128

# Expose ports
EXPOSE 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /usr/local/bin/healthcheck

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/conductor/web-orchestration/server.js"]

# Development stage (for local development)
FROM node:${NODE_VERSION}-alpine AS development
WORKDIR /app
RUN apk add --no-cache python3 make g++ git
COPY package*.json ./
RUN npm install
COPY . .
USER node:node
EXPOSE 8080 9090 9229
CMD ["npm", "run", "dev"]
