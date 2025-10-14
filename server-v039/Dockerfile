FROM node:20-alpine AS base
WORKDIR /app
COPY server-v039/package.json server-v039/tsconfig.json ./
RUN npm i --omit=dev
COPY server-v039/src ./src
COPY graphql ./graphql
RUN npx tsc -p tsconfig.json

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/graphql ./graphql
COPY server-v039/package.json ./
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["node","dist/index.js"]