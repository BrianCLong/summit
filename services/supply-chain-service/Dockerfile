FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY .npmrc ./

# Copy packages and services needed
COPY packages/ ./packages/
COPY services/supply-chain-service/ ./services/supply-chain-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm -r --filter "./packages/**" build

# Build service
RUN pnpm --filter supply-chain-service build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/services/supply-chain-service/dist ./services/supply-chain-service/dist
COPY --from=base /app/services/supply-chain-service/package.json ./services/supply-chain-service/

WORKDIR /app/services/supply-chain-service

ENV NODE_ENV=production
ENV PORT=4020

EXPOSE 4020

CMD ["node", "dist/index.js"]
