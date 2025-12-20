FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY server.js ./server.js
EXPOSE 4100
HEALTHCHECK --interval=20s --timeout=5s --retries=5 CMD curl -f http://localhost:4100/health || exit 1
CMD ["node", "server.js"]
