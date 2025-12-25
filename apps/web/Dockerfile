# Apps Web Dockerfile (Vite)

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Assuming workspace usage, we might need root lockfile?
# But for now let's assume isolated build or use what's available.
# In monorepo, usually we copy root package.json and workspace file too.
# But keeping it simple for now if it works.

RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf # Optional custom config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
