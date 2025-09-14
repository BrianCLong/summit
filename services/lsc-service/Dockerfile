
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY dist/ .

CMD ["node", "index.js"]
