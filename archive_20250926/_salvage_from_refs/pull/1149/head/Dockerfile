# Multi-stage build for Maestro Conductor v0.3
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt* ./

# Install dependencies with caching
RUN npm ci --only=production && npm cache clean --force
RUN if [ -f requirements.txt ]; then pip3 install -r requirements.txt; fi

# Development stage
FROM base AS development
RUN npm ci && npm cache clean --force
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Install all dependencies for build
RUN npm ci

# Build TypeScript
RUN npm run build || echo "Build script not found, using source"

# Create directories for runtime
RUN mkdir -p logs prompts .maestro

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    git

# Create non-root user
RUN addgroup -g 1001 -S maestro && \
    adduser -S maestro -u 1001 -G maestro

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=maestro:maestro /app/package*.json ./
COPY --from=build --chown=maestro:maestro /app/node_modules ./node_modules
COPY --from=build --chown=maestro:maestro /app/server ./server
COPY --from=build --chown=maestro:maestro /app/services ./services
COPY --from=build --chown=maestro:maestro /app/prompts ./prompts
COPY --from=build --chown=maestro:maestro /app/.maestro ./.maestro
COPY --from=build --chown=maestro:maestro /app/activities ./activities

# Copy configuration files
COPY --chown=maestro:maestro docker-compose.yml ./
COPY --chown=maestro:maestro .env.maestro-dev ./

# Create required directories
RUN mkdir -p logs && chown maestro:maestro logs

# Switch to non-root user
USER maestro

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Expose ports
EXPOSE 4000 8080 9464

# Labels for metadata
LABEL \
    org.opencontainers.image.title="Maestro Conductor v0.3" \
    org.opencontainers.image.description="AI-powered development orchestrator with agent cooperation" \
    org.opencontainers.image.version="0.3.0" \
    org.opencontainers.image.vendor="IntelGraph" \
    org.opencontainers.image.source="https://github.com/your-org/intelgraph" \
    maestro.version="v0.3" \
    maestro.sprint="orchestrate-to-win"

# Start the application
CMD ["node", "server/orchestrator/maestro.js"]

# Alternative service targets
FROM production AS sei-collector
CMD ["node", "services/sei-collector/index.js"]

FROM production AS v24-activities
CMD ["node", "activities/src/index.js"]