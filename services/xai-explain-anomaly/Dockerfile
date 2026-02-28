FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 4000
CMD ["node","dist/index.js"]
