# Multi-stage build for runbook service

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY runbooks/engine ./runbooks/engine
COPY services/runbooks ./services/runbooks

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build runbook engine
WORKDIR /app/runbooks/engine
RUN pnpm build

# Build service
WORKDIR /app/services/runbooks
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built artifacts
COPY --from=builder /app/runbooks/engine/dist ./runbooks/engine/dist
COPY --from=builder /app/runbooks/engine/package.json ./runbooks/engine/
COPY --from=builder /app/services/runbooks/dist ./services/runbooks/dist
COPY --from=builder /app/services/runbooks/package.json ./services/runbooks/

# Copy workspace files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/services/runbooks

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/api/v1/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Expose port
EXPOSE 4000

# Run service
CMD ["node", "dist/index.js"]
