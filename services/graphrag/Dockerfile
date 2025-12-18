# GraphRAG Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./

# Copy service-specific files
COPY services/graphrag/package.json ./services/graphrag/
COPY services/graphrag/tsconfig.json ./services/graphrag/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @intelgraph/graphrag...

# Copy source code
COPY services/graphrag/src ./services/graphrag/src

# Build
RUN pnpm --filter @intelgraph/graphrag build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 graphrag

# Copy built application
COPY --from=builder /app/services/graphrag/dist ./dist
COPY --from=builder /app/services/graphrag/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8002/health || exit 1

# Switch to non-root user
USER graphrag

EXPOSE 8002

CMD ["node", "dist/server.js"]
