# Multi-stage build for IntelGraph
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
RUN npm ci
COPY . .
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
ARG GRAPHQL_SCHEMA_URL
ENV GRAPHQL_SCHEMA_URL=$GRAPHQL_SCHEMA_URL
RUN npm run build

FROM cgr.dev/chainguard/node:20 AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/turbo.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1
USER 1000
CMD ["npm", "run", "start:prod"]