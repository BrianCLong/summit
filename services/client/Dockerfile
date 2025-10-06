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
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy source code
COPY . .

# Build client application
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    cd client && pnpm run build

# Production stage - using nginx for static serving
FROM nginx:1.25-alpine AS final

# Set labels for OCI compliance
LABEL org.opencontainers.image.title="IntelGraph Client"
LABEL org.opencontainers.image.description="IntelGraph intelligence analysis platform client"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"
LABEL org.opencontainers.image.version="1.0.1"
LABEL org.opencontainers.image.revision="${VCS_REF:-unknown}"
LABEL org.opencontainers.image.created="${BUILD_DATE:-unknown}"
LABEL org.opencontainers.image.licenses="MIT"

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built application
COPY --from=build --chown=nginx:nginx /app/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY services/client/nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Run as non-root user
RUN addgroup -g 101 -S nginx-app && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx-app -g nginx-app nginx-app

USER nginx-app

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]