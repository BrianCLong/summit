FROM node:20-bookworm AS build
WORKDIR /app
ENV CI=1
RUN corepack enable
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack prepare pnpm@latest --activate && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi
COPY . .
RUN npm run build || pnpm build || yarn build

FROM nginx:1.27-alpine
RUN adduser -D -g '' app && mkdir -p /usr/share/nginx/html && chown -R app:app /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
USER app

