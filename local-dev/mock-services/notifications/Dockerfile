FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=7080
EXPOSE 7080

CMD ["npm", "run", "dev"]
