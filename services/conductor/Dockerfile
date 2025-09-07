# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=18.20.3
FROM node:${NODE_VERSION}-alpine AS base
ENV NODE_ENV=production \
    SOURCE_DATE_EPOCH=1700000000 \
    TZ=UTC
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile && pnpm build && \
    find dist -type f -exec touch -d " @$SOURCE_DATE_EPOCH" {} \;
LABEL org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/${REPO}"
