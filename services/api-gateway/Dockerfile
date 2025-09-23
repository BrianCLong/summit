FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api-gateway

# Copy built application
COPY --from=builder --chown=api-gateway:nodejs /app/dist ./dist
COPY --from=deps --chown=api-gateway:nodejs /app/node_modules ./node_modules
COPY --chown=api-gateway:nodejs package.json ./

USER api-gateway

EXPOSE 4000

CMD ["node", "dist/index.js"]