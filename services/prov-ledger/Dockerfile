FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 prov-ledger

# Copy built application
COPY --from=builder --chown=prov-ledger:nodejs /app/dist ./dist
COPY --from=deps --chown=prov-ledger:nodejs /app/node_modules ./node_modules
COPY --chown=prov-ledger:nodejs package.json ./

USER prov-ledger

EXPOSE 4010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4010/health || exit 1

CMD ["node", "dist/index.js"]