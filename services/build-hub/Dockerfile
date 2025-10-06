# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.14.0

# Dependencies stage
FROM node:${NODE_VERSION}-alpine AS deps
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    corepack prepare pnpm@9.0.0 --activate && \
    pnpm install --frozen-lockfile --prefer-offline

# Build stage
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm \
    pnpm run build && \
    pnpm prune --production

# Production stage
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS final

# Set labels for OCI compliance
LABEL org.opencontainers.image.title="Maestro Build Hub"
LABEL org.opencontainers.image.description="WebSocket hub for Maestro Build Plane real-time updates"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.revision="${VCS_REF:-unknown}"
LABEL org.opencontainers.image.created="${BUILD_DATE:-unknown}"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /home/node/app

ENV NODE_ENV=production
ENV PORT=3080

COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=build --chown=65532:65532 /app/package.json ./
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

USER 65532

EXPOSE 3080

CMD ["dist/index.js"]