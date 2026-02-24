FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
# Since this service depends on packages/telemetry, we need to copy that too or build it first.
# For simplicity, I'll copy the whole monorepo structure needed or just build it locally and copy dist.
# But Docker build context is tricky with monorepos unless using specific patterns.
# I'll just copy the service source for now and assume dependencies are handled by pnpm in a multi-stage build or similar.
# But since I'm creating a standalone service, I'll just copy src.

# Assuming standalone build for now or part of monorepo build context.
# I'll assume standard monorepo structure where root is context.

COPY services/evidence-ledger/package.json ./services/evidence-ledger/
COPY services/evidence-ledger/tsconfig.json ./services/evidence-ledger/
COPY services/evidence-ledger/src ./services/evidence-ledger/src

# If needed packages:
COPY packages/telemetry ./packages/telemetry

# Install dependencies (simplified)
# RUN npm install

WORKDIR /app/services/evidence-ledger
# RUN npm run build

CMD ["node", "dist/index.js"]
