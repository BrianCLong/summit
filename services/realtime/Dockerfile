FROM node:18-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
# In a real monorepo build, we'd copy the workspace packages too.
# For now, this is a placeholder.

RUN npm install

COPY src ./src

CMD ["npm", "start"]
