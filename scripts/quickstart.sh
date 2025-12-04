#!/bin/bash
set -e

# IntelGraph Quickstart Script
# Trivial setup for local development

echo "🚀 Starting IntelGraph Quickstart..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Start Infrastructure (Postgres, Neo4j, Redis)
# using docker-compose.dev.yml as defined in scripts/start-dev-environment.sh
echo "🏗️  Starting infrastructure..."
if command -v docker >/dev/null 2>&1; then
    npm run docker:dev -- up -d postgres neo4j redis
else
    echo "⚠️  Docker not found. Skipping infrastructure startup. Ensure DBs are running."
fi

# 3. Wait for DBs (simple sleep/check)
echo "⏳ Waiting for databases to initialize..."
sleep 10

# 4. Run Migrations
echo "🔄 Running migrations..."
npm run db:migrate

# 5. Start Development Servers
echo "🌐 Starting Dev Servers (Frontend + Backend)..."
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:4000"
echo "   - GraphQL:  http://localhost:4000/graphql"
echo "   Press Ctrl+C to stop."

npm run dev
