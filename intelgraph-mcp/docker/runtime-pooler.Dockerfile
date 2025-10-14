FROM node:20-slim AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY services/runtime-pooler/package.json services/runtime-pooler/
RUN npm install -g pnpm@9.6.0 && pnpm install --filter runtime-pooler --prod
COPY services/runtime-pooler/ services/runtime-pooler/
RUN pnpm --filter runtime-pooler build
CMD ["node", "services/runtime-pooler/dist/index.js"]
