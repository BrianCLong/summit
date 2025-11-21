# Model Training Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ./

# Copy packages this service depends on
COPY packages/forecasting/package.json packages/forecasting/
COPY packages/predictive-models/package.json packages/predictive-models/
COPY packages/feature-engineering/package.json packages/feature-engineering/
COPY services/model-training/package.json services/model-training/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/forecasting packages/forecasting
COPY packages/predictive-models packages/predictive-models
COPY packages/feature-engineering packages/feature-engineering
COPY services/model-training services/model-training
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter model-training-service build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# Copy built artifacts
COPY --from=builder /app/services/model-training/dist ./dist
COPY --from=builder /app/services/model-training/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
