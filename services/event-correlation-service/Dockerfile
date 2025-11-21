# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# Copy package sources
COPY packages/stream-processing ./packages/stream-processing
COPY packages/event-processing ./packages/event-processing
COPY packages/cep-engine ./packages/cep-engine
COPY packages/real-time-analytics ./packages/real-time-analytics
COPY services/event-correlation-service ./services/event-correlation-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @intelgraph/stream-processing build
RUN pnpm --filter @intelgraph/event-processing build
RUN pnpm --filter @intelgraph/cep-engine build
RUN pnpm --filter @intelgraph/real-time-analytics build
RUN pnpm --filter @intelgraph/event-correlation-service build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 correlation

# Copy built artifacts
COPY --from=builder /app/packages/stream-processing/dist ./packages/stream-processing/dist
COPY --from=builder /app/packages/stream-processing/package.json ./packages/stream-processing/
COPY --from=builder /app/packages/event-processing/dist ./packages/event-processing/dist
COPY --from=builder /app/packages/event-processing/package.json ./packages/event-processing/
COPY --from=builder /app/packages/cep-engine/dist ./packages/cep-engine/dist
COPY --from=builder /app/packages/cep-engine/package.json ./packages/cep-engine/
COPY --from=builder /app/packages/real-time-analytics/dist ./packages/real-time-analytics/dist
COPY --from=builder /app/packages/real-time-analytics/package.json ./packages/real-time-analytics/
COPY --from=builder /app/services/event-correlation-service/dist ./services/event-correlation-service/dist
COPY --from=builder /app/services/event-correlation-service/package.json ./services/event-correlation-service/

# Copy workspace config
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

USER correlation

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV BOOTSTRAP_SERVERS=streaming-service:9092

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the service
WORKDIR /app/services/event-correlation-service
CMD ["node", "dist/server.js"]
