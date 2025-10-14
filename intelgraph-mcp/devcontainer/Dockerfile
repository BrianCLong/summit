FROM node:20-bullseye

RUN corepack enable && corepack prepare pnpm@9.6.0 --activate \
  && apt-get update && apt-get install -y --no-install-recommends k6 nsjail \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
