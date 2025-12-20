FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 10001 -S sandbox && \
    adduser -u 10001 -S sandbox -G sandbox

# Install pnpm for production deps only
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/dist ./dist

# Create sandbox workspace
RUN mkdir -p /sandbox && chown sandbox:sandbox /sandbox

USER sandbox

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/index.js"]
