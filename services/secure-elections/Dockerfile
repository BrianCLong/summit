# Multi-stage build for secure elections service
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN pnpm build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 elections

# Install pnpm for production deps
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and install production deps
COPY package.json ./
RUN pnpm install --prod --ignore-scripts

# Copy built files
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER elections

# Expose port
EXPOSE 4020

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4020/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
