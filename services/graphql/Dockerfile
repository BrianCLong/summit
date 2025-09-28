FROM node:18-alpine
WORKDIR /app
COPY services/graphql/package*.json .
RUN npm install
COPY services/graphql/ .
RUN npm run build # Assuming a build step for TypeScript
CMD ["npm", "start"]