# syntax=docker/dockerfile:1
FROM node:20-slim as base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy root dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for the service and its local dependencies
# This leverages Docker's layer caching.
COPY packages/predictive-graph-intelligence/package.json ./packages/predictive-graph-intelligence/package.json
COPY packages/graph-algorithms/package.json ./packages/graph-algorithms/package.json
COPY services/predictd/package.json ./services/predictd/package.json

# Install dependencies for the service only
RUN pnpm install --filter predictd --prod --ignore-scripts

# Copy only required sources to reduce build context size
COPY services/predictd ./services/predictd
COPY packages/predictive-graph-intelligence ./packages/predictive-graph-intelligence
COPY packages/graph-algorithms ./packages/graph-algorithms
COPY tsconfig.base.json ./tsconfig.base.json

# Set the final working directory
WORKDIR /app/services/predictd

# Expose the service port
EXPOSE 4001

# Command to run the service
CMD ["pnpm", "start"]
