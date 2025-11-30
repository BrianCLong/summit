FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# ============================================
# Production image
# ============================================
FROM node:20-alpine AS production

LABEL org.opencontainers.image.title="Summit Admin CLI"
LABEL org.opencontainers.image.description="Unified Admin & SRE CLI for IntelGraph platform"
LABEL org.opencontainers.image.vendor="IntelGraph"
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit"

# Create non-root user
RUN addgroup -g 1001 -S adminuser && \
    adduser -S adminuser -u 1001 -G adminuser

WORKDIR /app

# Copy built files and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create config directory
RUN mkdir -p /home/adminuser/.config/summit-admin-cli && \
    chown -R adminuser:adminuser /home/adminuser

USER adminuser

# Set entrypoint
ENTRYPOINT ["node", "/app/dist/cli.js"]

# Default command shows help
CMD ["--help"]
