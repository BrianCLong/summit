FROM node:18-alpine

WORKDIR /app

COPY package.json ./
# No lockfile yet in this context, but in monorepo it might be tricky.
# We will just install dependencies for this app.
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
