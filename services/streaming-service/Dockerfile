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
COPY packages/stream-ingestion ./packages/stream-ingestion
COPY services/streaming-service ./services/streaming-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @intelgraph/stream-processing build
RUN pnpm --filter @intelgraph/event-processing build
RUN pnpm --filter @intelgraph/stream-ingestion build
RUN pnpm --filter @intelgraph/streaming-service build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 streaming

# Copy built artifacts
COPY --from=builder /app/packages/stream-processing/dist ./packages/stream-processing/dist
COPY --from=builder /app/packages/stream-processing/package.json ./packages/stream-processing/
COPY --from=builder /app/packages/event-processing/dist ./packages/event-processing/dist
COPY --from=builder /app/packages/event-processing/package.json ./packages/event-processing/
COPY --from=builder /app/packages/stream-ingestion/dist ./packages/stream-ingestion/dist
COPY --from=builder /app/packages/stream-ingestion/package.json ./packages/stream-ingestion/
COPY --from=builder /app/services/streaming-service/dist ./services/streaming-service/dist
COPY --from=builder /app/services/streaming-service/package.json ./services/streaming-service/

# Copy workspace config
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Create data directories
RUN mkdir -p /data /logs && chown -R streaming:nodejs /data /logs

USER streaming

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BROKER_HOST=0.0.0.0
ENV BROKER_PORT=9092
ENV DATA_DIR=/data
ENV LOG_DIR=/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 9092

# Start the service
WORKDIR /app/services/streaming-service
CMD ["node", "dist/server.js"]
