# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/sandbox-gateway/package.json ./services/sandbox-gateway/
COPY services/sandbox-tenant-profile/package.json ./services/sandbox-tenant-profile/
COPY services/datalab-service/package.json ./services/datalab-service/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy source files
COPY services/sandbox-gateway/ ./services/sandbox-gateway/
COPY services/sandbox-tenant-profile/ ./services/sandbox-tenant-profile/
COPY services/datalab-service/ ./services/datalab-service/
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter @intelgraph/sandbox-tenant-profile build
RUN pnpm --filter @intelgraph/datalab-service build
RUN pnpm --filter @intelgraph/sandbox-gateway build

# Production stage
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/services/sandbox-gateway/dist ./dist
COPY --from=builder /app/services/sandbox-gateway/package.json ./
COPY --from=builder /app/services/sandbox-gateway/src/graphql/schema.graphql ./dist/graphql/

# Copy workspace dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/sandbox-tenant-profile/dist ./node_modules/@intelgraph/sandbox-tenant-profile/dist
COPY --from=builder /app/services/sandbox-tenant-profile/package.json ./node_modules/@intelgraph/sandbox-tenant-profile/
COPY --from=builder /app/services/datalab-service/dist ./node_modules/@intelgraph/datalab-service/dist
COPY --from=builder /app/services/datalab-service/package.json ./node_modules/@intelgraph/datalab-service/

# Security hardening
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:4100/health/live || exit 1

# Environment
ENV NODE_ENV=production
ENV PORT=4100
ENV HOST=0.0.0.0

EXPOSE 4100

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Labels
LABEL org.opencontainers.image.title="Sandbox Gateway"
LABEL org.opencontainers.image.description="GraphQL Gateway for IntelGraph Sandbox and Data Lab Services"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"
