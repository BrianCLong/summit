# Multi-stage build for IntelGraph
FROM node:22-alpine AS base
WORKDIR /app
# Use pnpm for package management (version matches local repo)
RUN npm install -g pnpm@10.0.0

FROM base AS builder
WORKDIR /app

# 1. Fetch dependencies (this layer is cached until pnpm-lock.yaml changes)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# 2. Copy workspace config and source
COPY package.json turbo.json .pnpmfile.cjs ./
COPY . .

# 3. Install dependencies from virtual store (offline)
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
ARG GRAPHQL_SCHEMA_URL
ENV GRAPHQL_SCHEMA_URL=$GRAPHQL_SCHEMA_URL

# Build the application
RUN pnpm run build

FROM base AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 summit && \
    adduser --system --uid 1001 --ingroup summit summit

# Copy production dependencies (pruned)
# Note: In a monorepo, pruning is complex without 'turbo prune'.
# We will copy from builder where everything is installed.
COPY --from=builder --chown=summit:summit /app/node_modules ./node_modules
COPY --from=builder --chown=summit:summit /app/server/dist ./server/dist
COPY --from=builder --chown=summit:summit /app/server/package.json ./server/
COPY --from=builder --chown=summit:summit /app/packages ./packages
COPY --from=builder --chown=summit:summit /app/package.json ./
COPY --from=builder --chown=summit:summit /app/turbo.json ./
COPY --from=builder --chown=summit:summit /app/pnpm-workspace.yaml ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

USER summit
CMD ["node", "server/dist/src/index.js"]
