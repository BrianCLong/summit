# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.14.0

FROM node:${NODE_VERSION}-alpine AS deps
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    corepack prepare pnpm@9.0.0 --activate && \
    pnpm install --frozen-lockfile --prefer-offline

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .
RUN --mount=type=cache,target=/root/.local/share/pnpm \
    cd client && pnpm run build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS final

LABEL org.opencontainers.image.title="IntelGraph Client"
LABEL org.opencontainers.image.description="Hardened static client for IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/intelgraph"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /home/node/app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=65532:65532 /app/client/dist ./dist
COPY --chown=65532:65532 services/client/server.mjs ./server.mjs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://127.0.0.1:${process.env.PORT||3000}/health`, res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

USER 65532

EXPOSE 3000

CMD ["server.mjs"]
