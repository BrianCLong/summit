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
ARG GIT_COMMIT=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.source="https://github.com/BrianCLong/summit" \
      org.opencontainers.image.title="intelgraph-ui" \
      org.opencontainers.image.revision="$GIT_COMMIT" \
      org.opencontainers.image.created="$BUILD_DATE"
RUN adduser -D -g '' app && mkdir -p /usr/share/nginx/html && chown -R app:app /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD sh -c "wget -qO- http://localhost/ | grep -qi '<!doctype html>' || exit 1"
USER 101:101
