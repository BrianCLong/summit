# Base Node image with pnpm & production deps cache
FROM node:20-bullseye AS base
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch --prod