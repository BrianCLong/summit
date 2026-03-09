# Multi-stage build for Vision API Service
FROM nvidia/cuda:12.0-runtime-ubuntu22.04 AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    python3 \
    python3-pip \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    tesseract-ocr-deu \
    tesseract-ocr-chi-sim \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm@9.12.0

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# ===== Build stage =====
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages packages/
COPY services/vision-api services/vision-api/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@intelgraph/vision-api

# ===== Production stage =====
FROM base AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/vision-api ./services/vision-api
COPY --from=builder /app/package.json ./

# Copy Python models
COPY server/src/ai/models /app/server/src/ai/models

# Create upload directory
RUN mkdir -p /tmp/vision-uploads

# Set environment variables
ENV NODE_ENV=production
ENV VISION_API_PORT=8080
ENV UPLOAD_DIR=/tmp/vision-uploads

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start service
CMD ["node", "services/vision-api/dist/index.js"]
