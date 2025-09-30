FROM node:20-alpine
WORKDIR /app
COPY server/asr-bridge/package*.json ./
RUN npm ci --omit=dev
COPY server/asr-bridge ./ 
EXPOSE 9000
CMD ["node","index.js"]