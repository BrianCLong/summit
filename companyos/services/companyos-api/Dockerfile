FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN mkdir -p companyos/services/companyos-api companyos/policies companyos/schemas
COPY companyos/package.json companyos/tsconfig.json ./companyos/
COPY companyos/services/companyos-api/package.json companyos/services/companyos-api/tsconfig.json ./companyos/services/companyos-api/

RUN pnpm install --filter @companyos/companyos-api --prod --frozen-lockfile --ignore-scripts || \
  pnpm install --filter @companyos/companyos-api --prod --ignore-scripts

COPY companyos/services/companyos-api/src ./companyos/services/companyos-api/src
COPY companyos/policies ./companyos/policies
COPY companyos/schemas ./companyos/schemas

WORKDIR /app/companyos/services/companyos-api
RUN pnpm run build

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
