# Prediction Service Dockerfile
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
COPY packages/risk-scoring/package.json packages/risk-scoring/
COPY services/prediction-service/package.json services/prediction-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/forecasting packages/forecasting
COPY packages/predictive-models packages/predictive-models
COPY packages/risk-scoring packages/risk-scoring
COPY services/prediction-service services/prediction-service
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter prediction-service build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# Copy built artifacts
COPY --from=builder /app/services/prediction-service/dist ./dist
COPY --from=builder /app/services/prediction-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
