FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from base
COPY --from=base /app/dist ./dist
COPY --from=base /app/fixtures ./fixtures

# Set up CLI entrypoint
RUN chmod +x dist/cli.js

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
