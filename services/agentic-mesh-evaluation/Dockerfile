# Multi-stage build for Agentic Mesh Evaluation Service
# Optimized for production deployment

# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:18-alpine AS dependencies

WORKDIR /app/services/agentic-mesh-evaluation

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy package files
COPY services/agentic-mesh-evaluation/package.json services/agentic-mesh-evaluation/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile --prod

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:18-alpine AS builder

WORKDIR /app
COPY tsconfig.base.json ./

WORKDIR /app/services/agentic-mesh-evaluation

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy package files
COPY services/agentic-mesh-evaluation/package.json services/agentic-mesh-evaluation/pnpm-lock.yaml* services/agentic-mesh-evaluation/tsconfig.json ./

# Install ALL dependencies (including dev)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY services/agentic-mesh-evaluation/src ./src

# Build TypeScript
RUN pnpm build

# ==============================================================================
# Stage 3: Runtime
# ==============================================================================
FROM node:18-alpine AS runtime

# Add labels for metadata
LABEL maintainer="Summit Platform <platform@summit.dev>"
LABEL org.opencontainers.image.title="Agentic Mesh Evaluation"
LABEL org.opencontainers.image.description="Distributed AI Agent Mesh Coordination & Evaluation"
LABEL org.opencontainers.image.version="1.0.0"

# Install security updates and curl for health checks
RUN apk --no-cache upgrade && apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app/services/agentic-mesh-evaluation

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/services/agentic-mesh-evaluation/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/services/agentic-mesh-evaluation/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/agentic-mesh-evaluation/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4200

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:4200/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
