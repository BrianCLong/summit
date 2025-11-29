FROM node:18-alpine AS builder

WORKDIR /app

# Install system dependencies for native modules and TypeScript build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .

# Build TypeScript and strip dev dependencies for runtime
RUN npm run build && npm prune --omit=dev

FROM node:18-alpine AS runtime

WORKDIR /app

# Create non-root user for runtime security
RUN addgroup -g 10001 -S intelgraph && \
    adduser -S -D -H -u 10001 -G intelgraph app

ENV NODE_ENV=production
ENV PORT=4000

# Copy built artifacts and production dependencies
COPY --from=builder --chown=app:intelgraph /app /app

USER app
EXPOSE 4000

# Lightweight healthcheck without adding curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http');const req=http.request({hostname:'localhost',port:process.env.PORT||4000,path:'/health',timeout:4000},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.end();"

CMD ["node", "dist/index.js"]

