#!/bin/bash
# Revert LongRunJob to use setup-node/setup-pnpm actions properly or use corepack

# Fix Test Coverage failure
sed -i 's/jest "--coverage"/npm run test:unit -- --coverage/g' packages/multimodal/package.json || true
sed -i 's/jest "--coverage"/npm run test:unit -- --coverage/g' agents/multimodal/package.json || true

# Test E2E failed on playwright webServer process exited early.
# We need to make sure the app builds and starts properly for e2e tests
cat << 'APP_EOF' > server/.env.test
POSTGRES_DB=intelgraph
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=password
NEO4J_AUTH=neo4j/password
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://intelgraph:password@localhost:5432/intelgraph
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
JWT_SECRET=super-secret-smoke-test
REQUIRE_REAL_DBS=true
APP_EOF
