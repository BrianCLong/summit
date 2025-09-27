# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.14.0

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS final

LABEL org.opencontainers.image.title="IntelGraph API Gateway"
LABEL org.opencontainers.image.description="Edge gateway for IntelGraph APIs"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/intelgraph"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /home/node/app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=deps --chown=65532:65532 /app/package.json ./

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://127.0.0.1:${process.env.PORT||4000}/health`, res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

USER 65532

EXPOSE 4000

CMD ["dist/index.js"]
