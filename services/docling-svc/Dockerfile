# syntax=docker/dockerfile:1.6
FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json* tsconfig*.json jest.config.ts ./
RUN npm install --production=false
COPY src ./src
COPY tests ./tests
RUN npm run build && npm prune --production

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package.json ./
EXPOSE 7100
CMD ["node", "dist/index.js"]
