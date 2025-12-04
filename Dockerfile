# Multi-stage build for IntelGraph
FROM node:20-alpine AS base
RUN npm install -g turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=intelgraph-server --docker

FROM base AS builder
WORKDIR /app

# First install dependencies
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Then build the project
COPY --from=pruner /app/out/full/ .
# Arguments for build time
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
ARG GRAPHQL_SCHEMA_URL
ENV GRAPHQL_SCHEMA_URL=$GRAPHQL_SCHEMA_URL

RUN npm run build --workspace=server

FROM cgr.dev/chainguard/node:20 AS runtime
WORKDIR /app

# Copy built artifacts and dependencies
# Note: For a monorepo with npm, we usually copy the node_modules from builder
# or perform a production install. 'npm ci --omit=dev' in the pruned directory is safer.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "server/dist/index.js"]
