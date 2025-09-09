FROM node:20-alpine
WORKDIR /app
COPY services/docs-api/ ./
COPY docs/ops/meta/index.json /app/docs/ops/meta/index.json
RUN npm init -y && npm i express express-rate-limit
EXPOSE 8787
CMD ["node","server.js"]