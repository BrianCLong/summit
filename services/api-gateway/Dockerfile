FROM node:20-alpine

WORKDIR /app

# Install pnpm and curl for health checks
RUN npm install -g pnpm && apk add --no-cache curl

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy the gateway package manifest
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies for the gateway
RUN pnpm install --filter @intelgraph/api-gateway... --frozen-lockfile

# Copy the source code
COPY services/api-gateway ./services/api-gateway

WORKDIR /app/services/api-gateway

ENV NODE_ENV=development
EXPOSE 8080

# Use tsx for development
CMD ["npx", "tsx", "src/index.ts"]