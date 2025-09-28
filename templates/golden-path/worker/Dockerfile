# syntax=docker/dockerfile:1
FROM node:20.10.0-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "src/worker.js"]
