FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY ../../packages/logistics-automation-types/package.json ./packages/logistics-automation-types/

# Install dependencies
RUN npm install

# Copy source
COPY . .
COPY ../../packages/logistics-automation-types ./packages/logistics-automation-types

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4030

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4030/health || exit 1

CMD ["node", "dist/index.js"]
