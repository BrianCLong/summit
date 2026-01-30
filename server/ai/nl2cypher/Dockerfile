FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || true
EXPOSE 4020
CMD ["node","dist/index.js"]
