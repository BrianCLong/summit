# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -D typescript tsx

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

# Add metadata
LABEL org.opencontainers.image.title="Summit WebSocket Server"
LABEL org.opencontainers.image.description="High-availability WebSocket infrastructure for Summit platform"
LABEL org.opencontainers.image.vendor="IntelGraph"

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9001/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })" || exit 1

# Expose port
EXPOSE 9001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "dist/index.js"]
