# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:20.19.0-alpine
FROM ${NODE_IMAGE} AS base
WORKDIR /app

ARG SOURCE_DATE_EPOCH
ENV TZ=UTC
LABEL org.opencontainers.image.created=$SOURCE_DATE_EPOCH

ENV PNPM_VERSION=9.12.0
RUN npm install -g pnpm@${PNPM_VERSION}

FROM base AS builder
COPY . .

RUN pnpm install --frozen-lockfile

RUN mkdir /out && pnpm --filter intelgraph-server pack # Verified package name --pack-destination /out

FROM base AS runtime
COPY --from=builder /out/*.tgz /tmp/pkg.tgz
RUN pnpm add /tmp/pkg.tgz --prod --frozen-lockfile

CMD ["node", "node_modules/intelgraph-server/dist/src/index.js"]
