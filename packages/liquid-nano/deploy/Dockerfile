FROM node:20-slim AS base
WORKDIR /usr/src/app
COPY ../../package.json ../../package-lock.json* ./
RUN npm install --omit=dev
COPY ../../packages/liquid-nano ./packages/liquid-nano
RUN npm run --workspace @summit/liquid-nano build

FROM node:20-slim
WORKDIR /opt/liquid-nano
ENV NODE_ENV=production
COPY --from=base /usr/src/app/packages/liquid-nano/dist ./dist
COPY --from=base /usr/src/app/packages/liquid-nano/config ./config
COPY --from=base /usr/src/app/packages/liquid-nano/deploy/scripts ./scripts
COPY --from=base /usr/src/app/packages/liquid-nano/examples ./examples
RUN useradd --create-home runtime && chown -R runtime:runtime /opt/liquid-nano
USER runtime
EXPOSE 8080
CMD ["node", "../dist/index.js"]
