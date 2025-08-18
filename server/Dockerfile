FROM node:18-alpine

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

