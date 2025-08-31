# Conductor Web Orchestrator - Production Container
# Optimized for Phase 2A deployment with multi-stage build

FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Playwright dependencies for web scraping
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

FROM base AS deps
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --only=production --silent

FROM base AS build
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --silent

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/

# Build TypeScript
RUN npm run build --workspace=server

FROM base AS runtime
WORKDIR /app

# Copy node_modules and built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json

# Create non-root user for security
RUN addgroup -g 1001 -S conductor && \
    adduser -S conductor -u 1001 -G conductor

# Set up directories with proper permissions
RUN mkdir -p /app/logs /app/cache /tmp/conductor && \
    chown -R conductor:conductor /app /tmp/conductor

# Security hardening
RUN rm -rf /tmp/* /var/tmp/* /var/cache/apk/*

USER conductor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node server/dist/health-check.js || exit 1

# Environment setup
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/dist/conductor/web-orchestration/main.js"]

# Labels for container management
LABEL org.opencontainers.image.title="Conductor Web Orchestrator" \
      org.opencontainers.image.description="Universal Web Interface Orchestration Engine" \
      org.opencontainers.image.version="2.0.0-phase2a" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.source="https://github.com/company/intelgraph"