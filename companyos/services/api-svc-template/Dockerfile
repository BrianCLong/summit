FROM node:20-alpine AS base
WORKDIR /app

COPY package.json .npmrc* ./
RUN corepack enable \
  && pnpm install --no-frozen-lockfile

COPY tsconfig.json ./
COPY config ./config
COPY src ./src

RUN pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-lock.yaml* ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/config ./config

EXPOSE 4000
CMD ["node", "dist/index.js"]
