FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY server ./server
COPY config ./config
RUN npm run build

FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/config ./config
COPY package.json .
RUN npm ci --omit=dev --ignore-scripts
USER app
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["node", "dist/index.js"]
