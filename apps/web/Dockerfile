# Apps Web Dockerfile (Vite)

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.0.0

# 1. Fetch dependencies (cached layer)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# 2. Copy source
COPY package.json turbo.json .pnpmfile.cjs pnpm-workspace.yaml ./
COPY . .

# 3. Install dependencies from virtual store (offline)
RUN pnpm install --offline --frozen-lockfile --ignore-scripts

# Build the app
RUN cd apps/web && pnpm run build

# Production serve
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf # Optional custom config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
