# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy base config
COPY tsconfig.base.json ./

# Set up service directory structure
WORKDIR /app/services/ai-sandbox

# Copy service files
COPY services/ai-sandbox/package*.json ./
COPY services/ai-sandbox/tsconfig.json ./
COPY services/ai-sandbox/src ./src

# Install and build
RUN npm install
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/services/ai-sandbox/dist ./dist
COPY --from=builder /app/services/ai-sandbox/node_modules ./node_modules
COPY --from=builder /app/services/ai-sandbox/package.json ./

USER nodejs

EXPOSE 4020

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4020/health || exit 1

CMD ["node", "dist/index.js"]