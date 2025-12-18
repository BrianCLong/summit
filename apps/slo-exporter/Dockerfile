FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY tsconfig.json ./

RUN pnpm install

COPY src ./src

EXPOSE 9092

CMD ["npm", "start"]
