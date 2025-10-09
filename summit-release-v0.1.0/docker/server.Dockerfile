# Multi-stage build for API server
FROM node:20-bullseye AS build
WORKDIR /app
COPY server/package.json server/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate \
 && pnpm install --frozen-lockfile
COPY server .
RUN pnpm build

FROM node:20-bullseye AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD node dist/healthcheck.js || exit 1
CMD ["node","dist/index.js"]