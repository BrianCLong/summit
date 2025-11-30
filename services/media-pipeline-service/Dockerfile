# Build stage
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

# Builder stage
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production dependencies
FROM base AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4020

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mediapipeline

# Copy production dependencies and built files
COPY --from=prod-deps --chown=mediapipeline:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mediapipeline:nodejs /app/dist ./dist
COPY --from=builder --chown=mediapipeline:nodejs /app/package.json ./package.json

USER mediapipeline

EXPOSE 4020

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4020/health || exit 1

CMD ["node", "dist/index.js"]
