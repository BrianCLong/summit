FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
# Install all deps including devDeps for tsx
RUN pnpm install --no-frozen-lockfile
COPY . .
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]