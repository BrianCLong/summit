# syntax=docker/dockerfile:1.6

# --- build stage ---
FROM node:20-bullseye-slim AS build
WORKDIR /src

# Enforce lockfile presence to guarantee reproducibility
COPY package.json package-lock.json ./
RUN test -f package-lock.json

ENV NODE_ENV=production

# Install dependencies without dev packages
RUN npm ci --omit=dev

# Copy application source and build
COPY . .
RUN npm run build \
    && npm prune --omit=dev

# --- runtime stage ---
FROM gcr.io/distroless/nodejs20-debian12

ARG BUILD_SHA="unknown"
ARG BUILD_TIMESTAMP="unknown"
ARG SBOM_DIGEST=""

WORKDIR /app

COPY --from=build /src/dist ./dist
COPY --from=build /src/node_modules ./node_modules

USER 65532:65532
ENV NODE_ENV=production
ENV PORT=8080

LABEL org.opencontainers.image.source="https://github.com/summit/intelgraph" \
      org.opencontainers.image.revision="$BUILD_SHA" \
      org.opencontainers.image.created="$BUILD_TIMESTAMP" \
      org.opencontainers.image.base.name="gcr.io/distroless/nodejs20-debian12" \
      org.opencontainers.image.vendor="IntelGraph" \
      org.opencontainers.image.description="IntelGraph Node.js runtime (distroless, non-root, read-only)" \
      org.opencontainers.image.sbom="$SBOM_DIGEST"

EXPOSE 8080

# Minimal healthcheck that does not require a shell
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 CMD ["/usr/bin/node","-e","fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["dist/server.js"]
