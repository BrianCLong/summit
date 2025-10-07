# orchestrator/Dockerfile
# Multi-stage build for IntelGraph Orchestrator

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM cgr.dev/chainguard/node:20 AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/README.md ./

# Create a simple orchestrator server
RUN mkdir -p ./src
RUN echo 'console.log("IntelGraph Orchestrator starting...");' > ./src/index.js
RUN echo 'console.log("Fastlane enabled:", process.env.FASTLANE_ENABLED || "false");' >> ./src/index.js
RUN echo 'console.log("OTEL endpoint:", process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "not set");' >> ./src/index.js

EXPOSE 8000
ENV PORT=8000
ENV NODE_ENV=production

CMD ["node", "src/index.js"]