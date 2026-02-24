FROM node:20-alpine AS base
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN pnpm install --prod --no-frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install --no-frozen-lockfile

COPY src ./src
COPY tsconfig.json ./
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 agent-runtime

# Copy built application
COPY --from=builder --chown=agent-runtime:nodejs /app/dist ./dist
COPY --from=deps --chown=agent-runtime:nodejs /app/node_modules ./node_modules
COPY --chown=agent-runtime:nodejs package.json ./

# Copy runbooks
COPY --chown=agent-runtime:nodejs RUNBOOKS ./RUNBOOKS

USER agent-runtime

EXPOSE 4012

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4012/health || exit 1

CMD ["node", "dist/index.js"]