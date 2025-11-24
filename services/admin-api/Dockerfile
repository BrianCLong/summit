FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/admin-api ./services/admin-api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm --filter @intelgraph/metrics-exporter build
RUN pnpm --filter @intelgraph/slow-query-killer build

# Build admin-api
RUN pnpm --filter @intelgraph/admin-api build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built packages
COPY --from=builder /app/packages/metrics-exporter/dist ./packages/metrics-exporter/dist
COPY --from=builder /app/packages/metrics-exporter/package.json ./packages/metrics-exporter/
COPY --from=builder /app/packages/slow-query-killer/dist ./packages/slow-query-killer/dist
COPY --from=builder /app/packages/slow-query-killer/package.json ./packages/slow-query-killer/

# Copy built service
COPY --from=builder /app/services/admin-api/dist ./services/admin-api/dist
COPY --from=builder /app/services/admin-api/package.json ./services/admin-api/
COPY --from=builder /app/services/admin-api/src/schema.graphql ./services/admin-api/dist/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4100

ENV NODE_ENV=production
ENV ADMIN_API_PORT=4100

WORKDIR /app/services/admin-api

CMD ["node", "dist/index.js"]
