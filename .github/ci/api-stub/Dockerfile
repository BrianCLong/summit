FROM node:18-alpine
WORKDIR /app
COPY index.js ./index.js
RUN npm init -y && npm i express
EXPOSE 4000
CMD ["node","index.js"]
