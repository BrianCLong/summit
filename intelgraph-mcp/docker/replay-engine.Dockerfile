FROM node:20-slim AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY services/replay-engine/package.json services/replay-engine/
RUN npm install -g pnpm@9.6.0 && pnpm install --filter replay-engine --prod
COPY services/replay-engine/ services/replay-engine/
RUN pnpm --filter replay-engine build
CMD ["node", "services/replay-engine/dist/index.js"]
