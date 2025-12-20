FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/edge-computing/package.json packages/edge-computing/
COPY packages/edge-runtime/package.json packages/edge-runtime/
COPY packages/edge-ai/package.json packages/edge-ai/
COPY packages/federated-learning/package.json packages/federated-learning/
COPY packages/edge-sync/package.json packages/edge-sync/
COPY services/edge-orchestrator/package.json services/edge-orchestrator/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/edge-computing packages/edge-computing
COPY packages/edge-runtime packages/edge-runtime
COPY packages/edge-ai packages/edge-ai
COPY packages/federated-learning packages/federated-learning
COPY packages/edge-sync packages/edge-sync
COPY services/edge-orchestrator services/edge-orchestrator

# Build packages
RUN pnpm --filter @intelgraph/edge-computing build
RUN pnpm --filter @intelgraph/edge-runtime build
RUN pnpm --filter @intelgraph/edge-ai build
RUN pnpm --filter @intelgraph/federated-learning build
RUN pnpm --filter @intelgraph/edge-sync build

# Build service
RUN pnpm --filter @intelgraph/edge-orchestrator build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/edge-orchestrator/dist ./dist
COPY --from=builder /app/services/edge-orchestrator/package.json ./

# Create necessary directories
RUN mkdir -p /var/lib/edge/data /var/log/edge /var/lib/edge/models

EXPOSE 8080

CMD ["node", "dist/index.js"]
