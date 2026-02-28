#!/bin/bash
cat << 'INNER_EOF' > .env
POSTGRES_PASSWORD=ci-postgres-password
NEO4J_PASSWORD=ci-neo4j-password
JWT_SECRET=ci-jwt-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=ci-refresh-secret-at-least-32-chars
INNER_EOF

# Add setup to github actions
sed -i '/docker compose -f docker-compose.dev.yaml config/i \      - run: touch .env\n' .github/workflows/validate-compose.yaml || true
