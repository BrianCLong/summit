# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.14.0

# Dependencies stage
FROM node:${NODE_VERSION}-alpine AS deps
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

# Copy package management files
COPY package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    corepack prepare pnpm@9.0.0 --activate && \
    pnpm install --frozen-lockfile --prefer-offline

# Build stage
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Copy dependency cache
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy source code
COPY . .

# Build application with cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    pnpm run build && \
    pnpm prune --production

# Production stage
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS final

# Set labels for OCI compliance
LABEL org.opencontainers.image.title="IntelGraph Server"
LABEL org.opencontainers.image.description="IntelGraph intelligence analysis platform server"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"
LABEL org.opencontainers.image.version="1.0.1"
LABEL org.opencontainers.image.revision="${VCS_REF:-unknown}"
LABEL org.opencontainers.image.created="${BUILD_DATE:-unknown}"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /home/node/app

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy built application
COPY --from=build --chown=65532:65532 /app/server/dist ./dist
COPY --from=build --chown=65532:65532 /app/server/package.json ./
COPY --from=build --chown=65532:65532 /app/server/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run as non-root user (already set by distroless)
USER 65532

# Expose port
EXPOSE 4000

# Start application
CMD ["dist/index.js"]