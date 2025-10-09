# Build React client with Vite and serve via nginx
FROM node:20-bullseye AS build
WORKDIR /web
COPY client/package.json client/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate \
 && pnpm install --frozen-lockfile
COPY client .
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /web/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000 80