FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY apps/gateway/package.json ./apps/gateway/
COPY pnpm-lock.yaml pnpm-workspace.yaml* ./

# Copy libs as they are needed dependencies
COPY libs ./libs

WORKDIR /app/apps/gateway
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY apps/gateway .

# Build
RUN pnpm run build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node","server.js"]
