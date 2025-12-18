FROM node:18-alpine@sha256:a8f88948f856683d32d459c8370b02a43e116302d142e3418c0054475009008b

# Install system dependencies for native modules like canvas
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

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Skip TypeScript build for demo - use direct source execution
# RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
# Run directly from source for demonstration
CMD ["npx", "tsx", "src/index.ts"]
