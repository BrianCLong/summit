# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
# Install only production dependencies
RUN pnpm install --prod --no-frozen-lockfile
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]