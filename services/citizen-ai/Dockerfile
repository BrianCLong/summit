FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY services/citizen-ai/package.json ./services/citizen-ai/
COPY packages/language-models/package.json ./packages/language-models/
RUN pnpm install --frozen-lockfile --filter @intelgraph/citizen-ai...

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/citizen-ai/node_modules ./services/citizen-ai/node_modules
COPY . .
WORKDIR /app/services/citizen-ai
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3020

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 citizen-ai

# Copy built files
COPY --from=builder /app/services/citizen-ai/dist ./dist
COPY --from=builder /app/services/citizen-ai/package.json ./

USER citizen-ai

EXPOSE 3020

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3020/api/health || exit 1

CMD ["node", "dist/server.js"]
