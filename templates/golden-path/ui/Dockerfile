# syntax=docker/dockerfile:1
FROM node:20.10.0-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.7.6
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
