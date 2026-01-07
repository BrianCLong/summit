# Multi-stage build for IntelGraph
FROM node:20.18.3-alpine AS base
WORKDIR /app
# Use pnpm for package management (version must match package.json packageManager field)
RUN npm install -g pnpm@10.0.0
COPY package.json pnpm-lock.yaml turbo.json .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile --prod

FROM node:20.18.3-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.0.0
COPY package.json pnpm-lock.yaml turbo.json .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL
ARG GRAPHQL_SCHEMA_URL
ENV GRAPHQL_SCHEMA_URL=$GRAPHQL_SCHEMA_URL
RUN pnpm run build

FROM node:20.18.3-alpine AS runtime
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
