# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.14.0

# Stage 1: fetch workspace dependencies without installing them
FROM node:${NODE_VERSION}-alpine AS deps
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PNPM_STORE_PATH=${PNPM_HOME}/store
ENV PATH=$PNPM_HOME:$PATH
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /workspace

# Copy only the files required to resolve the dependency graph
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json

# Pre-fetch the packages needed for the server workspace only
RUN --mount=type=cache,target=${PNPM_STORE_PATH} \
    pnpm fetch --filter server...

# Stage 2: build and prune the application code
FROM node:${NODE_VERSION}-alpine AS build
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PNPM_STORE_PATH=${PNPM_HOME}/store
ENV PATH=$PNPM_HOME:$PATH
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /workspace

# Reuse the fetched store to perform an offline install for the server package only
COPY --from=deps ${PNPM_HOME} ${PNPM_HOME}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server server
RUN --mount=type=cache,target=${PNPM_STORE_PATH} \
    pnpm install --filter server... --frozen-lockfile --offline

# Build the server and stage only production dependencies
RUN pnpm --filter server... build
RUN pnpm --filter server... deploy --prod /opt/server

# Stage 3: minimal runtime image
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS final

# Set labels for OCI compliance
LABEL org.opencontainers.image.title="IntelGraph Server"
LABEL org.opencontainers.image.description="IntelGraph intelligence analysis platform server"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/intelgraph"
LABEL org.opencontainers.image.version="1.0.1"
LABEL org.opencontainers.image.revision="${VCS_REF:-unknown}"
LABEL org.opencontainers.image.created="${BUILD_DATE:-unknown}"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /home/node/app

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy only the optimized server payload produced by pnpm deploy
COPY --from=build --chown=65532:65532 /opt/server ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run as non-root user (already set by distroless)
USER 65532

# Expose port
EXPOSE 4000

# Start application
CMD ["dist/index.js"]
