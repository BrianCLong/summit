#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting IntelGraph Development Environment..."

# 1. Boot Neo4j, Redis, Postgres
echo "Starting Neo4j, Postgres, and Redis containers..."
docker-compose -f docker-compose.dev.yml up -d neo4j postgres redis

# 2. Wait for services to be healthy
echo "Waiting for Neo4j to be ready..."
until docker-compose -f docker-compose.dev.yml exec neo4j cypher-shell -u neo4j -p devpassword -e "RETURN 1" > /dev/null 2>&1; do
  printf '.'
  sleep 5
done
echo "Neo4j is ready."

echo "Waiting for Postgres to be ready..."
until docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U intelgraph -d intelgraph_dev > /dev/null 2>&1; do
  printf '.'
  sleep 5
done
echo "Postgres is ready."

echo "Waiting for Redis to be ready..."
until docker-compose -f docker-compose.dev.yml exec redis redis-cli -a devpassword INFO > /dev/null 2>&1; do
  printf '.'
  sleep 5
done
echo "Redis is ready."

# 3. Apply migrations (Postgres migrations are handled by docker-entrypoint-initdb.d for initial setup)
# For subsequent runs, we need to explicitly run migrations.
echo "Applying server migrations..."
cd server
npm run migrate
cd ..

# 4. Seed data
# Ingest sample_graph.cypher into Neo4j
echo "Ingesting sample_graph.cypher into Neo4j..."
docker-compose -f docker-compose.dev.yml exec -T neo4j cypher-shell -u neo4j -p devpassword < server/db/seeds/neo4j/sample_graph.cypher

# Seed demo-v1.json using npm script
echo "Seeding demo data from demo-v1.json..."
cd server
npm run seed:demo
cd ..

# 5. Start backend server
echo "Starting backend server..."
cd server
npm run dev &
cd ..

# 6. Start frontend server
echo "Starting frontend server..."
cd client
npm run dev &
cd ..

echo "IntelGraph Development Environment setup complete."
echo "Frontend is running on http://localhost:3000"
echo "Backend is running on http://localhost:4000"