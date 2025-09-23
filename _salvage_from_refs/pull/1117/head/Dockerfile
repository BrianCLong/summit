# syntax=docker/dockerfile:1
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --fund=false

FROM deps AS build
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs18-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
USER nonroot
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["dist/index.js"]