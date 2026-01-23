FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy root configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy packages source (needed for workspace dependencies)
COPY packages ./packages

# Copy app source
COPY apps/intelgraph-api ./apps/intelgraph-api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
WORKDIR /app/apps/intelgraph-api
RUN pnpm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
