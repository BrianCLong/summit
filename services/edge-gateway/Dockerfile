FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY services/edge-gateway/package.json services/edge-gateway/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY services/edge-gateway services/edge-gateway

# Build service
RUN pnpm --filter @intelgraph/edge-gateway build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/edge-gateway/dist ./dist
COPY --from=builder /app/services/edge-gateway/package.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
